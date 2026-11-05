package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponUseRequest;
import com.murukmuruk.domain.coupon.dto.CouponUseResponse;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.coupon.enums.UsableScope;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.repository.OrderRepository;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class CouponUseService {

    private static final int MAX_ITEM_NAME_LENGTH = 100;

    private final UserRepository userRepository;
    private final CouponRepository couponRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final MerchantRepository merchantRepository;
    private final OrderRepository orderRepository;
    private final ChainClient chainClient;

    /**
     * 쿠폰 사용: 검증 → 주문(PENDING) 저장 → 쿠폰 USED(조건부 UPDATE) → 체인 소각 → 주문 PAID.
     * 중간에 실패하면 전부 롤백되어 쿠폰은 ACTIVE 그대로 남는다.
     */
    @Transactional
    public CouponUseResponse use(Long userId, Long couponId, CouponUseRequest request) {
        // 0. 요청 값 검증 (400)
        if (request == null || request.merchantId() == null
                || request.itemName() == null || request.itemName().isBlank()
                || request.itemName().length() > MAX_ITEM_NAME_LENGTH
                || request.totalAmount() == null || request.totalAmount() < 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        long totalAmount = request.totalAmount();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 일시 정지된 계정
        }

        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        // 검증 1. 소유권 (403)
        if (!coupon.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        Merchant merchant = merchantRepository.findById(request.merchantId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        CouponPolicy policy = couponPolicyRepository.findById(coupon.getCouponPolicyId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        // 검증 5. 미사용 상태 (409) - 재사용을 가장 먼저 걸러낸다. 최종 판단은 아래 조건부 UPDATE가 한다.
        if (coupon.getState() == CouponState.USED) {
            throw new BusinessException(ErrorCode.COUPON_CONFLICT);
        }
        // 검증 3. 유효기간 (400)
        if (coupon.getExpiresAt().isBefore(now)) {
            throw new BusinessException(ErrorCode.COUPON_BAD_REQUEST);
        }
        // 검증 4. 사용 가능 가맹점 (400): 발행한 가게에서만, 그리고 활성 가맹점이어야 한다
        boolean usableMerchant = policy.getUsableScope() == UsableScope.OWN_SHOP
                && policy.getMerchantId().equals(merchant.getId())
                && merchant.getStatus() == MerchantStatus.ACTIVE;
        if (!usableMerchant) {
            throw new BusinessException(ErrorCode.COUPON_BAD_REQUEST);
        }
        // 검증 2. 최소 주문 금액 (400)
        if (totalAmount < policy.getMinOrderAmount()) {
            throw new BusinessException(ErrorCode.COUPON_BAD_REQUEST);
        }

        // 할인 금액 = min(쿠폰 할인 금액, 주문 금액)
        long discountAmount = Math.min(policy.getDiscountAmount(), totalAmount);

        // 주문을 PENDING으로 먼저 저장한다 (쿠폰의 used_order_id가 주문을 가리키므로)
        Order order = orderRepository.saveAndFlush(
                Order.create(userId, merchant.getId(), request.itemName(), totalAmount, discountAmount));
        Long orderId = order.getId();

        // 쿠폰을 USED로 바꾼다. 아직 ACTIVE일 때만 1행이 바뀐다 (동시 사용·재사용 방지)
        if (couponRepository.markUsed(couponId, orderId, now) == 0) {
            throw new BusinessException(ErrorCode.COUPON_CONFLICT); // 롤백되어 주문도 남지 않는다
        }

        // 체인에서 쿠폰 소각. 실패하면 예외로 롤백되어 쿠폰은 ACTIVE 그대로 남는다
        String txHash;
        try {
            txHash = chainClient.burnCoupon(coupon.getTokenId(), user.getWalletAddress(), merchant.getWalletAddress());
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.CHAIN_ERROR);
        }

        // 소각이 확정되면 주문 완료 (조건부 UPDATE에서 영속성 컨텍스트가 비워졌으므로 다시 조회한다)
        Order paid = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR));
        paid.markPaid();

        return new CouponUseResponse(
                couponId, CouponStatus.USED, now, orderId, merchant.getId(),
                paid.getItemName(), totalAmount, discountAmount, paid.getPaidAmount(), txHash);
    }
}