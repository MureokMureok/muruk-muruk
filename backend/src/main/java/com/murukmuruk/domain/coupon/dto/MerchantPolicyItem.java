package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.global.util.TimeText;

/** 가맹점 콘솔 "우리 가게 쿠폰" 목록의 항목 (프론트 getStorePolicies와 같은 이름) */
public record StorePolicyItem(
        long id,
        String name,
        long value,          // 1장당 할인 금액
        long minOrder,       // 최소 주문 금액
        Integer validDays,   // 받은 뒤 유효 일수
        int quantity,        // 발행 수량
        int claimed,         // 받아 간 장수
        long used,           // 그중 사용 완료한 장수
        String createdAt     // "2026-11-03 18:20"
) {
    public static StorePolicyItem of(CouponPolicy p, long used) {
        return new StorePolicyItem(p.getId(), p.getName(), p.getDiscountAmount(), p.getMinOrderAmount(),
                p.getValidDays(), p.getQuantity(), p.getIssuedCount(), used, TimeText.at(p.getCreatedAt()));
    }
}