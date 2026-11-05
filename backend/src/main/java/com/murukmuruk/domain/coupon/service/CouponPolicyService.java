package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponPolicyCreateRequest;
import com.murukmuruk.domain.coupon.dto.CouponPolicyCreateResponse;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.enums.UsableScope;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.MerchantLimitRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CouponPolicyService {

    private final MerchantLimitRepository merchantLimitRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final ChainClient chainClient;

    /**
     * 쿠폰 발행: 한도 차감 → 정책 저장 → 체인 등록.
     * 한 트랜잭션이라 체인 등록이 실패하면 한도 차감과 정책 저장이 함께 되돌아간다.
     */
    @Transactional
    public CouponPolicyCreateResponse create(Long merchantId, CouponPolicyCreateRequest request) {
        validateRules(request);

        Merchant merchant = merchantLimitRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!merchant.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 활성 가맹점만 발행 가능
        }

        long discountAmount = request.discountAmount();
        int quantity = request.quantity();
        long totalAmount;
        try {
            totalAmount = Math.multiplyExact(discountAmount, (long) quantity); // 발행 총액
        } catch (ArithmeticException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 금액이 너무 커서 계산 불가
        }

        // 남은 한도가 충분할 때만 차감된다. 0건이 갱신되면 한도 초과.
        if (merchantLimitRepository.increaseIssuedAmount(merchantId, totalAmount) == 0) {
            throw new BusinessException(ErrorCode.LIMIT_EXCEEDED);
        }

        long minOrderAmount = request.minOrderAmount() == null ? 0 : request.minOrderAmount();
        CouponPolicy policy = couponPolicyRepository.save(CouponPolicy.create(
                merchantId, request.name(), discountAmount, request.receiveType(),
                request.receiveAmount(), minOrderAmount, request.validDays(),
                request.usableScope(), quantity));

        String txHash;
        try {
            txHash = chainClient.registerCouponPolicy(
                    policy.getId(), merchant.getWalletAddress(), discountAmount, quantity);
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.CHAIN_ERROR); // 롤백됨
        }

        // 조건부 UPDATE 이후 최신 남은 한도를 다시 읽는다
        long remainingLimit = merchantLimitRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND))
                .getRemainingLimit();

        return CouponPolicyCreateResponse.of(policy, totalAmount, remainingLimit, txHash);
    }

    /** 요청 값 조합 검사: 어긋나면 400 */
    private void validateRules(CouponPolicyCreateRequest request) {
        ReceiveType type = request.receiveType();

        if (type == ReceiveType.CAMPAIGN) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 기획전 조건은 일반 발행 불가
        }
        if (type == ReceiveType.MIN_AMOUNT && request.receiveAmount() == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 기준 금액 필수
        }
        if (type != ReceiveType.MIN_AMOUNT && request.receiveAmount() != null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 그 외 조건은 기준 금액 보내면 안 됨
        }
        if (request.usableScope() != UsableScope.OWN_SHOP) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 현재는 우리 매장만 허용
        }
    }
}