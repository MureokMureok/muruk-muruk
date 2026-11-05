package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;

import java.time.LocalDateTime;

/** 쿠폰함 조회 쿼리 결과 한 줄. API 상태(ISSUED/USED/EXPIRED)는 서비스에서 계산한다. */
public record CouponRow(
        Long couponId,
        String name,
        Long merchantId,
        String merchantName,
        MerchantCategory category,
        Long discountAmount,
        Long minOrderAmount,
        LocalDateTime expiresAt,
        CouponState state
) {
}