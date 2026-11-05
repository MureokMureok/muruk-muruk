package com.murukmuruk.domain.coupon.enums;

/** DB에 저장하는 쿠폰 상태. 만료는 저장하지 않고 expires_at으로 계산한다. */
public enum CouponState {
    ACTIVE,  // 사용 가능
    USED     // 사용 완료
}