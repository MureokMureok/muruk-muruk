package com.murukmuruk.domain.coupon.enums;

/** 쿠폰 받는 조건. 데모에서는 DIRECT만 사용한다. */
public enum ReceiveType {
    DIRECT,          // 바로 배포 (사용자가 직접 받기)
    FIRST_PURCHASE,  // 첫 구매
    MIN_AMOUNT,      // 일정 금액 이상 구매
    CAMPAIGN         // 기획전 참여 구매
}