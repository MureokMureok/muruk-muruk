package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.enums.UsableScope;

/** 쿠폰 발행 응답 (명세 6번) */
public record CouponPolicyCreateResponse(
        long couponPolicyId,
        String name,
        long discountAmount,
        ReceiveType receiveType,
        Long receiveAmount,
        long minOrderAmount,
        Integer validDays,
        UsableScope usableScope,
        int quantity,
        long totalAmount,     // 할인 금액 × 수량
        long remainingLimit,  // 발행 후 남은 한도
        String txHash         // 체인 등록 거래 해시
) {
    public static CouponPolicyCreateResponse of(CouponPolicy policy, long totalAmount,
                                                long remainingLimit, String txHash) {
        return new CouponPolicyCreateResponse(
                policy.getId(), policy.getName(), policy.getDiscountAmount(),
                policy.getReceiveType(), policy.getReceiveAmount(), policy.getMinOrderAmount(),
                policy.getValidDays(), policy.getUsableScope(), policy.getQuantity(),
                totalAmount, remainingLimit, txHash);
    }
}
