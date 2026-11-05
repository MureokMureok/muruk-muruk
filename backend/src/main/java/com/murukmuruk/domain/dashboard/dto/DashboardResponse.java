package com.murukmuruk.domain.dashboard.dto;

import com.murukmuruk.domain.merchant.enums.MerchantCategory;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;

/** 가맹점 대시보드 응답 (명세 3번) */
public record DashboardResponse(
        long merchantId,
        String name,
        MerchantCategory category,
        MerchantStatus status,
        String walletAddress,
        long issueLimit,          // 예치금 (지금까지 등록된 발행 한도 합계)
        long issuedAmount,        // 발행한 쿠폰 금액
        long remainingLimit,      // 남은 발행 한도
        long campaignFundAmount   // 진행 중 기획전 충전금 합계 (기획전은 이번 범위 밖이라 0)
) {
}