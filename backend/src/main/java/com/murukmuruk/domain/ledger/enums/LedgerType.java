package com.murukmuruk.domain.ledger.enums;

/** 기록 종류 (프론트 기록 화면의 type과 같다) */
public enum LedgerType {
    ISSUE,   // 쿠폰 발급
    CONFIRM, // 구매 확정
    APPLY,   // 결제에 쿠폰 적용 (쿠폰 잠금)
    USE,     // 사용 완료
    REFUND,  // 취소·환불
    REJECT,  // 거절 (재사용 시도 등)
    ADMIN    // 관리 (가맹점 승인, 기획전 만들기, 쿠폰 조건 등록, 상태 변경)
}