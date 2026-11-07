package com.murukmuruk.domain.settlement.dto;

import com.murukmuruk.domain.coupon.enums.ReceiveType;

import java.time.LocalDateTime;

/** 정산 내역 쿼리 결과 한 줄. 쿠폰 종류와 이름 마스킹은 서비스에서 처리한다. */
public record SettlementRow(
        Long orderId,
        LocalDateTime usedAt,
        String couponName,
        ReceiveType receiveType,
        String customerName,
        Long discountAmount
) {
}