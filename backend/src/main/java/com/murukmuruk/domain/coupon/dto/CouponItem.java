package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;

import java.time.LocalDateTime;

/** 내 쿠폰함 목록의 항목 (명세: GET /api/coupons) */
public record CouponItem(
        long couponId,
        String name,
        long merchantId,
        String merchantName,
        MerchantCategory category,
        long discountAmount,
        long minOrderAmount,
        LocalDateTime expiresAt,
        CouponStatus status,
        String campaignTitle // 기획전 쿠폰이 아니면 null (기획전은 아직 없음)
) {
    public static CouponItem of(CouponRow row, LocalDateTime now) {
        return new CouponItem(
                row.couponId(), row.name(), row.merchantId(), row.merchantName(), row.category(),
                row.discountAmount(), row.minOrderAmount(), row.expiresAt(),
                CouponStatus.of(row.state(), row.expiresAt(), now),
                null);
    }
}