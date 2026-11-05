package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.merchant.enums.MerchantCategory;

/** 받을 수 있는 쿠폰 목록의 항목 (명세: GET /api/coupon-policies) */
public record CouponPolicyItem(
        long couponPolicyId,
        String name,
        long merchantId,
        String merchantName,
        MerchantCategory category,
        long discountAmount,
        long minOrderAmount,
        Integer validDays,
        int remainingCount,    // 더 받을 수 있는 장수 (발행 수량 - 발급 수량)
        boolean alreadyClaimed // 내가 이미 받았는지
) {
    public static CouponPolicyItem of(CouponPolicyRow row, boolean alreadyClaimed) {
        return new CouponPolicyItem(
                row.couponPolicyId(), row.name(), row.merchantId(), row.merchantName(), row.category(),
                row.discountAmount(), row.minOrderAmount(), row.validDays(), row.remainingCount(),
                alreadyClaimed);
    }
}