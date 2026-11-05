package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.enums.CouponStatus;

import java.time.LocalDateTime;

/** 쿠폰 받기 응답 (명세: POST /api/coupon-policies/{id}/claim) */
public record CouponClaimResponse(
        long couponId,
        String name,
        long merchantId,
        String merchantName,
        long discountAmount,
        long minOrderAmount,
        LocalDateTime expiresAt,
        CouponStatus status,
        String txHash
) {
}