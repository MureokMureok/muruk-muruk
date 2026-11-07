package com.murukmuruk.domain.campaign.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;

import java.util.List;

/**
 * GET /api/merchants/{id}/purchase-preview : 이 가게에서 사면 받을 쿠폰 미리보기 (저장하지 않는다).
 * coupons는 받을 쿠폰, missed는 한도가 다 차서 못 받는 쿠폰(reason 포함).
 */
public record PurchasePreviewResponse(
        CampaignStatus campaignStatus,
        List<PreviewCoupon> coupons,
        List<PreviewCoupon> missed
) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PreviewCoupon(
            Long campaignId,
            String title,
            Long merchantId,
            String merchantName,
            String merchantShort,
            String merchantColor,
            String merchantCategory,
            long value,
            long minOrder,
            String validity,
            String expiresAt,   // 지금 받으면 사용할 수 있는 마지막 날
            String reason       // missed일 때만
    ) {
    }
}