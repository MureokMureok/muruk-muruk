package com.murukmuruk.domain.dashboard.controller;

import com.murukmuruk.domain.dashboard.dto.DashboardResponse;
import com.murukmuruk.domain.dashboard.service.DashboardService;
import com.murukmuruk.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/merchants/me")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /** GET /api/merchants/me/dashboard : 한도, 발행 금액, 남은 한도 조회 */
    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> dashboard(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(dashboardService.getDashboard(Long.valueOf(jwt.getSubject())));
    }
}