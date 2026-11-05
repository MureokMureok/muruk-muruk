package com.murukmuruk.domain.auth.controller;

import com.murukmuruk.domain.auth.dto.GoogleLoginRequest;
import com.murukmuruk.domain.auth.dto.GoogleLoginResponse;
import com.murukmuruk.domain.auth.service.AuthService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** POST /api/auth/google : 구글 ID 토큰으로 로그인 (신규면 가입) */
    @SecurityRequirements // 공개 API: Swagger에서 인증(자물쇠) 표시 제거
    @PostMapping("/google")
    public ApiResponse<GoogleLoginResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ApiResponse.success(authService.loginWithGoogle(request.idToken()));
    }
}