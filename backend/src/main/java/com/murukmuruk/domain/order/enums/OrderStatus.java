package com.murukmuruk.domain.order.enums;

/**
 * 주문 상태.
 * 일반 쿠폰 주문: PENDING(처리 중) → PAID(완료) / FAILED(실패)
 * 기획전 주문:    PAID(결제됨) → CONFIRMED(구매 확정) / CANCELLED(취소·환불)
 */
public enum OrderStatus {
    PENDING, PAID, FAILED, CONFIRMED, CANCELLED
}