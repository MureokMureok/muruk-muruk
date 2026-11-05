package com.murukmuruk.domain.settlement.dto;

/** 할인 금액 합계 */
public record SettlementSummary(
        long generalDiscountAmount,  // 일반 쿠폰 사용 할인액 합계
        long campaignDiscountAmount  // 기획전 쿠폰 사용 할인액 합계
) {
}