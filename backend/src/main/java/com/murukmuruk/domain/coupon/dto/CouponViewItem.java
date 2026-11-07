package com.murukmuruk.domain.coupon.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.murukmuruk.domain.coupon.enums.CouponViewStatus;

/**
 * 기획전 화면용 쿠폰 한 장 (프론트 couponView와 같은 이름·모양).
 * 일반 쿠폰도 같은 모양으로 내려가며, 기획전 정보(campaignId, fromMerchant...)는 없다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CouponViewItem(
        Long id,
        Long campaignId,
        String title,               // 기획전 이름 (일반 쿠폰은 쿠폰 이름)
        Long merchantId,            // 쿠폰을 쓸 수 있는 가게
        String merchantName,
        String merchantShort,
        String merchantColor,
        String merchantCategory,
        long value,                 // 할인 금액
        long minOrder,              // 최소 주문 금액
        String validity,            // DAYS30 / END
        String expiresAt,           // 사용 가능한 마지막 날 "2026-12-03"
        CouponViewStatus status,
        String issuedAt,
        Long fromMerchantId,        // 쿠폰을 받게 한 구매 가게
        String fromMerchantName,
        Long orderId,               // 쿠폰을 받은 주문
        long issuedTogether,        // 같은 구매로 받은 쿠폰 수
        Long discount,              // 결제에 적용된 할인 (사용 처리 중·사용 완료일 때)
        String appliedAt,           // 결제에 적용한 시각
        String usedAt,              // 사용 완료 시각
        Long ownerId
) {
}