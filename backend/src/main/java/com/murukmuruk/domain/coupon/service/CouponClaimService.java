package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponClaimResponse;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.coupon.repository.MerchantLimitRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.chain.ChainClient.MintResult;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class CouponClaimService {

    private final UserRepository userRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final CouponRepository couponRepository;
    private final MerchantLimitRepository merchantLimitRepository;
    private final ChainClient chainClient;

    /**
     * 쿠폰 받기: 사용자 잠금 → 검증 → 발급 수량 +1 → 체인 발행(NFT) → 쿠폰 저장.
     * 한 트랜잭션이라 중간에 실패하면 발급 수량 증가도 함께 되돌아간다.
     * (체인 발행 자체는 DB 롤백으로 되돌릴 수 없으므로, 체인 호출 전에 중복을 정확히 걸러내는 것이 중요하다.
     *  실체인 연동 시에는 발행 후 DB 실패에 대한 보상(소각) 전략이 추가로 필요하다.)
     */
    @Transactional
    public CouponClaimResponse claim(Long userId, Long couponPolicyId) {
        // 같은 사용자의 동시 요청을 줄 세운다 (반드시 첫 쿼리).
        // 잠금을 얻은 뒤의 조회는 앞 요청이 커밋한 결과까지 보므로, 아래 중복 검사가 정확해진다.
        couponRepository.lockUser(userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 일시 정지된 계정
        }

        CouponPolicy policy = couponPolicyRepository.findById(couponPolicyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Merchant merchant = merchantLimitRepository.findById(policy.getMerchantId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!merchant.isActive()) {
            throw new BusinessException(ErrorCode.NOT_FOUND); // 활성 가맹점의 쿠폰만 받을 수 있다
        }
        if (policy.getReceiveType() != ReceiveType.DIRECT) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 바로 받을 수 있는 쿠폰이 아님
        }
        if (couponRepository.existsByUserIdAndCouponPolicyId(userId, couponPolicyId)) {
            throw new BusinessException(ErrorCode.CONFLICT); // 이미 받은 쿠폰
        }

        // 조건부 UPDATE 후에는 영속성 컨텍스트가 비워지므로 필요한 값을 먼저 꺼내 둔다
        String couponName = policy.getName();
        long discountAmount = policy.getDiscountAmount();
        long minOrderAmount = policy.getMinOrderAmount();
        int validDays = policy.getValidDays();
        Long merchantId = merchant.getId();
        String merchantName = merchant.getName();

        // 남은 수량이 있을 때만 올라간다. 0건이 갱신되면 소진.
        if (couponPolicyRepository.increaseIssuedCount(couponPolicyId) == 0) {
            throw new BusinessException(ErrorCode.CONFLICT);
        }

        MintResult minted;
        try {
            minted = chainClient.mintCoupon(couponPolicyId, user.getWalletAddress());
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.CHAIN_ERROR); // 롤백됨
        }

        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        LocalDateTime expiresAt = now.plusDays(validDays);
        Coupon coupon;
        try {
            coupon = couponRepository.saveAndFlush(
                    Coupon.issue(couponPolicyId, userId, minted.tokenId(), expiresAt));
        } catch (DataIntegrityViolationException e) {
            // 마지막 안전망: 유일 제약(user_id + coupon_policy_id)에 걸린 경우
            throw new BusinessException(ErrorCode.CONFLICT);
        }

        return new CouponClaimResponse(
                coupon.getId(), couponName, merchantId, merchantName,
                discountAmount, minOrderAmount, expiresAt,
                CouponStatus.of(coupon.getState(), expiresAt, now), minted.txHash());
    }
}