package com.murukmuruk.domain.campaign.dto;

import java.time.LocalDate;
import java.util.List;

/** POST /api/admin/campaigns : 새 기획전 만들기 (프론트 createCampaign과 같은 이름) */
public record CampaignCreateRequest(
        String title,
        LocalDate startDate,
        LocalDate endDate,
        List<Long> merchantIds
) {
}