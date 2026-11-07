package com.murukmuruk.domain.coupon.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.murukmuruk.domain.ledger.entity.LedgerEntry;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.global.util.TimeText;

/**
 * 쿠폰 한 장의 기록 한 줄 (소비자 "발급·사용 기록" 화면용).
 * 프론트 getCouponHistory 항목과 같은 이름: id, type, at, merchantName, tx, summary, claimed, voided, reason, couponStatus
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CouponHistoryItem(
        long id,
        LedgerType type,
        String at,            // "2026-11-03 18:20"
        Long merchantId,
        String merchantName,  // 기록에 남은 가게 (발급·확정은 산 가게, 적용·사용은 결제한 가게)
        String tx,            // 체인 거래 해시 (없을 수 있음)
        String summary,       // 짧은 설명. 환불은 "쿠폰 복원" 같은 제목, 거절은 실패한 확인 항목
        boolean claimed,      // 일반 쿠폰을 직접 받은 발급이면 true (구매로 받은 발급은 false)
        boolean voided,       // 구매 취소로 쿠폰이 소멸한 기록이면 true
        String reason,        // 거절(REJECT) 기록의 에러 코드 (예: COUPON_ALREADY_USED)
        String couponStatus   // 거절(REJECT) 기록 당시 쿠폰 상태 (예: PROCESSING, USED)
) {
    public static CouponHistoryItem of(LedgerEntry e, String merchantName) {
        String detail = e.getDetail();
        // 기록 문장은 "가게 ... · 설명" 모양이라 마지막 " · " 뒤가 짧은 설명이 된다
        int cut = detail.lastIndexOf(" · ");
        String summary = cut >= 0 ? detail.substring(cut + 3) : detail;
        return new CouponHistoryItem(
                e.getId(), e.getType(), TimeText.at(e.getCreatedAt()), e.getMerchantId(), merchantName,
                e.getTxHash(), summary,
                e.getType() == LedgerType.ISSUE && e.getOrderId() == null,
                e.getType() == LedgerType.REFUND && detail.endsWith("쿠폰 소멸"),
                e.getReasonCode(), e.getCouponStatus());
    }
}