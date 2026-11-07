package com.murukmuruk.domain.coupon.enums;

/** DB에 저장하는 쿠폰 상태. 만료는 저장하지 않고 expires_at으로 계산한다. */
public enum CouponState {
    PENDING, // 확정 대기: 기획전 구매를 확정하기 전 (발급 락업)
    ACTIVE,  // 사용 가능
    IN_USE,  // 결제 중: 다른 가게 결제에 적용돼 구매 확정을 기다리는 중 (사용 락업)
    USED,    // 사용 완료
    VOIDED   // 무효: 구매가 취소돼 사라진 쿠폰
}