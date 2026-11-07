package com.murukmuruk.domain.order.dto;

import com.murukmuruk.domain.coupon.dto.CouponViewItem;

import java.util.List;

/** 구매 결과: 주문, 발급된 쿠폰(잠김), 못 받은 쿠폰과 사유. pending은 항상 false (프론트의 "발급 확인 중" 시연용 자리) */
public record PurchaseResponse(
        OrderView order,
        List<CouponViewItem> issuedCoupons,
        List<MissedCouponView> missedCoupons,
        boolean pending
) {
}