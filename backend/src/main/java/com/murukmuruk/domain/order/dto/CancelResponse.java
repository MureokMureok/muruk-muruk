package com.murukmuruk.domain.order.dto;

import com.murukmuruk.domain.coupon.dto.CouponViewItem;

import java.util.List;

/** 주문 취소 결과: 주문, 상태가 바뀐 쿠폰 */
public record CancelResponse(
        OrderView order,
        List<CouponViewItem> coupons
) {
}