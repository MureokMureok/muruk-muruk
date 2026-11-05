package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.enums.CouponStatus;

import java.time.LocalDateTime;

public record CouponUseResponse(
        long couponId,
        CouponStatus status,   // 항상 USED
        LocalDateTime usedAt,
        long orderId,
        long merchantId,
        String itemName,
        long totalAmount,
        long discountAmount,
        long paidAmount,
        String txHash          // 쿠폰 소각 체인 거래 해시
) {
}