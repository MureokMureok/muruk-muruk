package com.murukmuruk.domain.merchant.controller;

import com.murukmuruk.domain.merchant.dto.MerchantLoginRequest;
import com.murukmuruk.domain.merchant.dto.MerchantLoginResponse;
import com.murukmuruk.domain.merchant.service.MerchantAuthService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/merchants/auth")
@RequiredArgsConstructor
public class MerchantAuthController {

    private final MerchantAuthService merchantAuthService;

    /** POST /api/merchants/auth/google : 가맹점 로그인 (SecurityConfig에서 이미 permitAll) */
    @SecurityRequirements // 공개 API: Swagger 자물쇠 표시 제거
    @PostMapping("/google")
    public ApiResponse<MerchantLoginResponse> googleLogin(@Valid @RequestBody MerchantLoginRequest request) {
        return ApiResponse.success(merchantAuthService.login(request.idToken()));
    }
}