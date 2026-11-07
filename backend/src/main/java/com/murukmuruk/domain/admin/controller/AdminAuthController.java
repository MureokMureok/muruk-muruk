package com.murukmuruk.domain.admin.controller;

import com.murukmuruk.domain.admin.dto.AdminLoginRequest;
import com.murukmuruk.domain.admin.dto.AdminLoginResponse;
import com.murukmuruk.domain.admin.service.AdminAuthService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 로그인", description = "KCP 관리자 로그인입니다. 허용된 이메일만 로그인할 수 있습니다.")
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    /** POST /api/admin/auth/google : 관리자 로그인 (SecurityConfig에서 이미 permitAll) */
    @Operation(summary = "관리자 로그인 (구글)",
            description = "구글 ID 토큰으로 로그인합니다. 서버 설정의 관리자 허용 목록(ADMIN_EMAILS)에 있는 이메일만 가능하고, "
                    + "아니면 403입니다. 응답의 accessToken을 이후 요청의 Authorization: Bearer 에 넣으세요.")
    @SecurityRequirements // 공개 API: Swagger 자물쇠 표시 제거
    @PostMapping("/google")
    public ApiResponse<AdminLoginResponse> googleLogin(@Valid @RequestBody AdminLoginRequest request) {
        return ApiResponse.success(adminAuthService.login(request.idToken()));
    }
}