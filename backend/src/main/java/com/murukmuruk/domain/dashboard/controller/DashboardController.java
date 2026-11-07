package com.murukmuruk.domain.dashboard.controller;

import com.murukmuruk.domain.dashboard.dto.DashboardResponse;
import com.murukmuruk.domain.dashboard.service.DashboardService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "가맹점 - 대시보드", description = "가맹점 콘솔의 발행 한도 현황입니다. (가맹점 전용)")
@RestController
@RequestMapping("/api/merchants/me")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /** GET /api/merchants/me/dashboard : 한도, 발행 금액, 남은 한도 조회 */
    @Operation(summary = "대시보드 (한도 현황)",
            description = "우리 가게의 발행 한도, 지금까지 발행한 금액, 남은 한도를 돌려줍니다.")
    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> dashboard(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(dashboardService.getDashboard(Long.valueOf(jwt.getSubject())));
    }
}