package com.murukmuruk.domain.campaign.dto;

/** GET /api/merchants/{id}/product : 가게 상품 (시연용 1개) + 가게 표시 정보 */
public record ProductResponse(
        Long merchantId,
        String name,
        long price,
        String merchantName,
        String merchantShort,
        String merchantColor,
        String merchantCategory
) {
}