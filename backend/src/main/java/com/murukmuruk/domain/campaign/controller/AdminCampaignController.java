package com.murukmuruk.domain.campaign.controller;

import com.murukmuruk.domain.campaign.dto.CampaignCreateRequest;
import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.CampaignStatusRequest;
import com.murukmuruk.domain.campaign.service.CampaignAdminService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** KCP 관리자: 기획전 관리. /api/admin/** 는 ROLE_ADMIN만 (SecurityConfig) */
@Tag(name = "관리자 - 기획전", description = "KCP 운영팀이 기획전을 만들고 시작·중지·종료를 승인합니다. (관리자 전용)")
@RestController
@RequestMapping("/api/admin/campaigns")
@RequiredArgsConstructor
public class AdminCampaignController {

    private final CampaignAdminService campaignAdminService;

    @Operation(summary = "기획전 목록",
            description = "만들어진 기획전 전체와 참여 가게별 쿠폰 조건, 손님 흐름(누가 어디서 사서 어떤 쿠폰을 받았는지)을 돌려줍니다.")
    @GetMapping
    public ApiResponse<List<CampaignResponse>> list() {
        return ApiResponse.success(campaignAdminService.list());
    }

    @Operation(summary = "기획전 만들기",
            description = "이름, 기간, 참여 가게(2~20곳, 승인된 가게만)를 정해 기획전을 만듭니다. "
                    + "처음 상태는 PREPARING(준비 중)이고, 가게마다 기본 쿠폰 조건이 채워집니다. 성공하면 201.")
    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping
    public ApiResponse<CampaignResponse> create(@RequestBody CampaignCreateRequest request) {
        return ApiResponse.created(campaignAdminService.create(request));
    }

    @Operation(summary = "기획전 상태 변경",
            description = "시작 승인(PREPARING→ACTIVE), 일시 중지(ACTIVE→PAUSED), 다시 진행(PAUSED→ACTIVE), 종료(→ENDED). "
                    + "시작 승인은 참여 가게가 모두 조건을 등록해야 하고(아니면 NOT_READY), 이때 가게마다 쿠폰 정책이 만들어집니다. "
                    + "허용되지 않는 변경은 INVALID_STATUS.")
    @PostMapping("/{campaignId}/status")
    public ApiResponse<CampaignResponse> changeStatus(@PathVariable Long campaignId,
                                                      @RequestBody CampaignStatusRequest request) {
        return ApiResponse.success(campaignAdminService.changeStatus(campaignId, request));
    }
}