package com.murukmuruk.domain.campaign.controller;

import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.ProductResponse;
import com.murukmuruk.domain.campaign.dto.PurchasePreviewResponse;
import com.murukmuruk.domain.campaign.service.CampaignQueryService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 소비자 기획전 조회. SecurityConfig에서 GET만 로그인 없이 열어 둔다. */
@Tag(name = "소비자 - 기획전 조회", description = "로그인 없이 볼 수 있는 기획전, 가게 상품, 구매 시 받을 쿠폰 미리보기입니다.")
@RestController
@RequiredArgsConstructor
public class CampaignPublicController {

    private final CampaignQueryService campaignQueryService;

    @Operation(summary = "기획전 목록 (비회원 가능)",
            description = "기획전 전체와 참여 가게별 상품·쿠폰 조건을 돌려줍니다.")
    @GetMapping("/api/campaigns")
    public ApiResponse<List<CampaignResponse>> list() {
        return ApiResponse.success(campaignQueryService.list());
    }

    @Operation(summary = "소비자 화면의 기획전 (비회원 가능)",
            description = "소비자 화면에 보여 줄 기획전과 참여 가게(남은 수량 포함)입니다. 진행 중(ACTIVE)인 기획전이 있으면 그중 먼저 만든 것을, "
                    + "없으면 가장 최근 기획전을 돌려줍니다. 그래서 status가 PREPARING, PAUSED, ENDED일 수 있으니 "
                    + "화면에서는 status를 확인해야 합니다. 기획전이 하나도 없을 때만 404입니다.")
    @GetMapping("/api/campaigns/current")
    public ApiResponse<CampaignResponse> current() {
        return ApiResponse.success(campaignQueryService.current());
    }

    @Operation(summary = "가게 상품 (비회원 가능)",
            description = "가게의 대표 상품입니다. 시연용으로 가게마다 25,000원 상품 1개입니다.")
    @GetMapping("/api/merchants/{merchantId}/product")
    public ApiResponse<ProductResponse> product(@PathVariable Long merchantId) {
        return ApiResponse.success(campaignQueryService.product(merchantId));
    }

    @Operation(summary = "구매 시 받을 쿠폰 미리보기 (비회원 가능)",
            description = "이 가게에서 구매하면 받게 될 다른 가게 쿠폰(coupons)과, 수량이 소진돼 못 받는 쿠폰(missed)을 보여 줍니다.")
    @GetMapping("/api/merchants/{merchantId}/purchase-preview")
    public ApiResponse<PurchasePreviewResponse> preview(@PathVariable Long merchantId) {
        return ApiResponse.success(campaignQueryService.preview(merchantId));
    }
}