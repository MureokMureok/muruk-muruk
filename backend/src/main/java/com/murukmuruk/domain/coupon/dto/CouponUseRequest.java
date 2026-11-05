package com.murukmuruk.domain.coupon.dto;

/** 쿠폰 사용 요청 (명세: POST /api/coupons/{couponId}/use) */
public record CouponUseRequest(
        Long merchantId,   // 쿠폰을 사용할 가맹점
        String itemName,   // 주문명 (최대 100자)
        Long totalAmount   // 주문 금액 (1 이상)
) {
}