package com.murukmuruk.domain.order.dto;

import com.murukmuruk.domain.coupon.dto.CouponViewItem;

import java.util.Map;

/** 쿠폰 적용 결과: 주문, 쿠폰(사용 처리 중), 5가지 확인 결과(모두 true). pending은 항상 false */
public record RedeemResponse(
        OrderView order,
        CouponViewItem coupon,
        Map<String, Boolean> checks,
        boolean pending
) {
}