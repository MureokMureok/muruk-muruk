package com.murukmuruk.domain.order.dto;

import com.murukmuruk.domain.coupon.dto.CouponViewItem;

import java.util.List;

/** 구매 확정 결과: 주문, 상태가 바뀐 쿠폰, 지금 쓸 수 있는 내 쿠폰 */
public record ConfirmResponse(
        OrderView order,
        List<CouponViewItem> coupons,
        List<CouponViewItem> leftCoupons
) {
}