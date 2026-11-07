package com.murukmuruk.domain.campaign.dto;

import com.murukmuruk.domain.campaign.enums.TermValidity;

/**
 * PUT /api/merchants/me/campaigns/{campaignId}/terms : 우리 가게 쿠폰 조건 저장
 * register가 true면 "기획전에 등록하기", false나 null이면 "임시 저장". 이름은 프론트 form과 같다.
 */
public record TermUpdateRequest(
        Long value,          // 1장당 할인 금액
        Long minOrder,       // 최소 주문 금액
        TermValidity validity,
        Long cap,            // 할인 한도
        Boolean register
) {
}