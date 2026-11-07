package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.coupon.enums.UsableScope;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;

import java.time.LocalDateTime;
import java.util.List;

/** 쿠폰 상세 응답 (명세: GET /api/coupons/{couponId}) */
public record CouponDetailResponse(
        long couponId,
        String name,
        CouponStatus status,
        long discountAmount,
        long minOrderAmount,
        LocalDateTime expiresAt,
        LocalDateTime issuedAt,
        LocalDateTime usedAt,      // 사용 전이면 null
        long tokenId,
        MerchantInfo merchant,
        UsableScope usableScope,
        List<UsableMerchant> usableMerchants,
        CampaignInfo campaign      // 기획전 쿠폰이 아니면 null (기획전은 아직 없음)
) {
    public record MerchantInfo(long merchantId, String name, MerchantCategory category) {
    }

    public record UsableMerchant(long merchantId, String name) {
    }

    public record CampaignInfo(long campaignId, String title) {
    }
}