package com.murukmuruk.domain.settlement.controller;

import com.murukmuruk.domain.settlement.dto.SettlementListResponse;
import com.murukmuruk.domain.settlement.service.SettlementService;
import com.murukmuruk.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/merchants/me/settlements")
@RequiredArgsConstructor
public class MerchantSettlementController {

    private final SettlementService settlementService;

    /** GET /api/merchants/me/settlements : 쿠폰 사용(정산) 내역 (가맹점 전용) */
    @GetMapping
    public ApiResponse<SettlementListResponse> list(@AuthenticationPrincipal Jwt jwt,
                                                    @RequestParam(required = false) Long cursor,
                                                    @RequestParam(required = false) Integer size) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(settlementService.getSettlements(merchantId, cursor, size));
    }
}