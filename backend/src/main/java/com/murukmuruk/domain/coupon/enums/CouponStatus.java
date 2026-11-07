package com.murukmuruk.domain.coupon.enums;

import java.time.LocalDateTime;

/** 일반 쿠폰 API로 내려주는 쿠폰 상태 (명세의 CouponStatus). 저장값(CouponState)과 만료 시각으로 계산한다. */
public enum CouponStatus {
    ISSUED,   // 발급됨, 사용 가능
    USED,     // 사용됨
    EXPIRED;  // 사용하지 않고 만료됨

    public static CouponStatus of(CouponState state, LocalDateTime expiresAt, LocalDateTime now) {
        if (state == CouponState.USED) {
            return USED;
        }
        if (state == CouponState.VOIDED) {
            return EXPIRED; // 구매가 취소돼 사라진 기획전 쿠폰은 일반 API에서는 만료처럼 보인다
        }
        return expiresAt.isBefore(now) ? EXPIRED : ISSUED;
    }
}