package com.murukmuruk.domain.order.dto;

/**
 * POST /api/orders 요청.
 * couponId가 없으면 "구매"(모의 결제 후 다른 가게 쿠폰 발급), 있으면 "결제에 쿠폰 적용"(쿠폰 사용).
 * merchantId는 결제하는 가게다.
 */
public record OrderRequest(Long merchantId, Long couponId) {
}