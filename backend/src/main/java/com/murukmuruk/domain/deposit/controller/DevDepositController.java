package com.murukmuruk.domain.deposit.controller;

import com.murukmuruk.domain.deposit.dto.DevDepositRequest;
import com.murukmuruk.domain.deposit.dto.DevDepositResponse;
import com.murukmuruk.domain.deposit.service.DepositService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "개발용 (로컬 전용)", description = "개발·시연에서만 쓰는 API입니다. APP_DEV_ENABLED=true일 때만 열리며 배포 환경에서는 꺼야 합니다.")
@RestController
@RequestMapping("/api/merchants/me/dev")
@ConditionalOnProperty(name = "app.dev.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DevDepositController {

    private final DepositService depositService;

    /** POST /api/merchants/me/dev/deposit : 로그인한 가맹점에 입금 처리 */
    @Operation(summary = "[개발용] 임시 입금",
            description = "로그인한 가맹점에 입금을 기록하고 발행 한도에 더합니다. 실제 입금 감지를 대신하는 시연용 API입니다.")
    @PostMapping("/deposit")
    public ApiResponse<DevDepositResponse> deposit(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestBody DevDepositRequest request) {
        Long merchantId = Long.valueOf(jwt.getSubject()); // 가맹점 토큰의 sub = merchantId
        return ApiResponse.success(depositService.devDeposit(merchantId, request.amount()));
    }
}