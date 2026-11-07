package com.murukmuruk.domain.campaign.controller;

import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.TermUpdateRequest;
import com.murukmuruk.domain.campaign.service.CampaignMerchantService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 가맹점: 참여 기획전. /api/merchants/me/** 는 ROLE_MERCHANT만 (SecurityConfig) */
@Tag(name = "가맹점 - 기획전", description = "가맹점이 참여한 기획전을 확인하고 우리 가게 쿠폰 조건을 등록합니다. (가맹점 전용)")
@RestController
@RequestMapping("/api/merchants/me/campaigns")
@RequiredArgsConstructor
public class MerchantCampaignController {

    private final CampaignMerchantService campaignMerchantService;

    @Operation(summary = "내가 참여한 기획전 현황",
            description = "우리 가게가 참여한 기획전과 우리 가게 쿠폰 조건(mine), 발급·사용 현황, 조건 변경 이력을 돌려줍니다.")
    @GetMapping
    public ApiResponse<List<CampaignResponse>> list(@AuthenticationPrincipal Jwt jwt) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(campaignMerchantService.myCampaigns(merchantId));
    }

    @Operation(summary = "우리 가게 쿠폰 조건 저장·등록",
            description = "할인 금액(value), 최소 주문 금액(minOrder), 유효기간(validity: DAYS30 또는 END), 할인 한도(cap)를 저장합니다. "
                    + "register=true면 \"기획전에 등록하기\", false나 생략하면 임시 저장입니다. "
                    + "기획전이 시작된 뒤에는 바꿀 수 없고(LOCKED), 값이 잘못되면 INVALID입니다.")
    @PutMapping("/{campaignId}/terms")
    public ApiResponse<CampaignResponse> saveTerms(@AuthenticationPrincipal Jwt jwt,
                                                   @PathVariable Long campaignId,
                                                   @RequestBody TermUpdateRequest request) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(campaignMerchantService.saveTerms(merchantId, campaignId, request));
    }
}