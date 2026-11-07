package com.murukmuruk.domain.coupon.enums;

import java.time.LocalDateTime;

/**
 * 기획전 화면용 쿠폰 상태 (프론트 mock의 6가지와 같은 이름).
 * 저장값(CouponState) → 화면 값: PENDING→LOCKED, ACTIVE→AVAILABLE, IN_USE→PROCESSING, USED, VOIDED
 * 유효기간이 지난 ACTIVE는 EXPIRED (저장하지 않고 내려줄 때 계산).
 */
public enum CouponViewStatus {
    LOCKED,      // 잠김: 구매 확정 전
    AVAILABLE,   // 사용 가능
    PROCESSING,  // 사용 처리 중: 다른 가게 결제에 적용돼 구매 확정 전
    USED,        // 사용 완료
    VOIDED,      // 소멸: 구매 취소
    EXPIRED;     // 만료

    public static CouponViewStatus of(CouponState state, LocalDateTime expiresAt, LocalDateTime now) {
        return switch (state) {
            case PENDING -> LOCKED;
            case ACTIVE -> expiresAt.isBefore(now) ? EXPIRED : AVAILABLE;
            case IN_USE -> PROCESSING;
            case USED -> USED;
            case VOIDED -> VOIDED;
        };
    }
}