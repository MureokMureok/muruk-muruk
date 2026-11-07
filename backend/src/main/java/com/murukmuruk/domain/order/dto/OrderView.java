package com.murukmuruk.domain.order.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.enums.OrderStatus;
import com.murukmuruk.global.util.TimeText;

/** 주문 한 건 (프론트 order와 같은 이름: productName, amount, discount, paid, couponId, status, at) */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderView(
        Long id,
        Long userId,
        Long merchantId,
        String productName,
        long amount,       // 할인 전 금액
        long discount,     // 할인 금액
        long paid,         // 결제 금액
        Long couponId,     // 쿠폰을 적용한 주문이면 그 쿠폰
        OrderStatus status,
        String at
) {
    public static OrderView of(Order order, Long couponId) {
        return new OrderView(
                order.getId(), order.getUserId(), order.getMerchantId(), order.getItemName(),
                order.getTotalAmount(), order.getDiscountAmount(), order.getPaidAmount(), couponId,
                order.getStatus(), TimeText.at(order.getCreatedAt()));
    }
}