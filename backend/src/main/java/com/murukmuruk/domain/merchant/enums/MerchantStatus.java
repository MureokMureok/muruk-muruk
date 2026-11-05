package com.murukmuruk.domain.merchant.enums;

/** 가맹점 상태 */
public enum MerchantStatus {
    APPLIED,   // 신청 (KCP 승인 대기)
    ACTIVE,    // 활성 (KCP 승인 완료)
    SUSPENDED  // 일시 정지
}