package com.murukmuruk.domain.admin.controller;

import com.murukmuruk.domain.admin.dto.AdminLoginRequest;
import com.murukmuruk.domain.admin.dto.AdminLoginResponse;
import com.murukmuruk.domain.admin.service.AdminAuthService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    /** POST /api/admin/auth/google : 관리자 로그인 (SecurityConfig에서 이미 permitAll) */
    @SecurityRequirements // 공개 API: Swagger 자물쇠 표시 제거
    @PostMapping("/google")
    public ApiResponse<AdminLoginResponse> googleLogin(@Valid @RequestBody AdminLoginRequest request) {
        return ApiResponse.success(adminAuthService.login(request.idToken()));
    }
}