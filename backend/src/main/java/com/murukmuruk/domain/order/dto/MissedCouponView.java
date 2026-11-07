package com.murukmuruk.domain.order.dto;

/** 구매했지만 받지 못한 쿠폰 (예: 그 가게 쿠폰이 한도까지 모두 발급됨) */
public record MissedCouponView(
        Long campaignId,
        String title,
        Long merchantId,
        String merchantName,
        String merchantShort,
        String merchantColor,
        String merchantCategory,
        long value,
        long minOrder,
        String validity,
        String reason
) {
}