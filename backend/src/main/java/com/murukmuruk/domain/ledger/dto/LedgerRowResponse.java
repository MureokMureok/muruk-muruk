package com.murukmuruk.domain.ledger.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.murukmuruk.domain.ledger.entity.LedgerEntry;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.global.util.TimeText;

/** 기록 한 줄 (프론트 ledger 항목과 같은 이름: id, tx, at, type, detail, actor, discount, amount ...) */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LedgerRowResponse(
        long id,
        String tx,           // 체인 거래 해시 (없을 수 있음)
        String at,           // "2026-11-03 18:20"
        LedgerType type,
        String detail,
        String actor,
        Long merchantId,
        Long userId,
        Long campaignId,
        Long couponId,
        Long orderId,
        Long discount,       // 할인 금액
        Long amount          // 주문 금액
) {
    public static LedgerRowResponse from(LedgerEntry e) {
        return new LedgerRowResponse(
                e.getId(), e.getTxHash(), TimeText.at(e.getCreatedAt()), e.getType(), e.getDetail(), e.getActor(),
                e.getMerchantId(), e.getUserId(), e.getCampaignId(), e.getCouponId(), e.getOrderId(),
                e.getDiscountAmount(), e.getOrderAmount());
    }
}