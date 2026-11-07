package com.murukmuruk.domain.settlement.dto;

import com.murukmuruk.domain.coupon.enums.CouponType;

import java.time.LocalDateTime;

/** 쿠폰 사용 내역 한 건 (명세: GET /api/merchants/me/settlements) */
public record SettlementItem(
        long orderId,
        LocalDateTime usedAt,
        String couponName,
        CouponType couponType,
        String customerName, // 마스킹된 이름 (예: 지*)
        long discountAmount
) {
}