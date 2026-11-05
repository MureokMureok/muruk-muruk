package com.murukmuruk.domain.deposit.controller;

import com.murukmuruk.domain.deposit.dto.DevDepositRequest;
import com.murukmuruk.domain.deposit.dto.DevDepositResponse;
import com.murukmuruk.domain.deposit.service.DepositService;
import com.murukmuruk.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개발/시연용 임시 입금 API.
 * 환경변수 APP_DEV_ENABLED=true 일 때만 등록된다 (기본은 꺼짐).
 */
@RestController
@RequestMapping("/api/merchants/me/dev")
@ConditionalOnProperty(name = "app.dev.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DevDepositController {

    private final DepositService depositService;

    /** POST /api/merchants/me/dev/deposit : 로그인한 가맹점에 입금 처리 */
    @PostMapping("/deposit")
    public ApiResponse<DevDepositResponse> deposit(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestBody DevDepositRequest request) {
        Long merchantId = Long.valueOf(jwt.getSubject()); // 가맹점 토큰의 sub = merchantId
        return ApiResponse.success(depositService.devDeposit(merchantId, request.amount()));
    }
}