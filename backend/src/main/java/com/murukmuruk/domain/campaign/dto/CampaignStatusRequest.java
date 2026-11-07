package com.murukmuruk.domain.campaign.dto;

import com.murukmuruk.domain.campaign.enums.CampaignStatus;

/** POST /api/admin/campaigns/{id}/status : 시작 승인(ACTIVE) / 일시 중지(PAUSED) / 다시 진행(ACTIVE) / 종료(ENDED) */
public record CampaignStatusRequest(CampaignStatus status) {
}