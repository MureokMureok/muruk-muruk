package com.murukmuruk.domain.auth.controller;

import com.murukmuruk.domain.auth.dto.GoogleLoginRequest;
import com.murukmuruk.domain.auth.dto.GoogleLoginResponse;
import com.murukmuruk.domain.auth.service.AuthService;
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

@Tag(name = "소비자 - 로그인", description = "소비자 구글 로그인입니다. 처음 로그인하면 계정과 지갑이 자동으로 만들어집니다.")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** POST /api/auth/google : 구글 ID 토큰으로 로그인 (신규면 가입) */
    @Operation(summary = "소비자 로그인 (구글)",
            description = "구글 ID 토큰으로 로그인합니다. 처음이면 가입과 지갑 생성을 함께 하고(isNewUser=true), 이미 가입했으면 기존 계정과 지갑을 씁니다. "
                    + "응답의 accessToken을 이후 요청의 Authorization: Bearer 에 넣으세요. 일시 정지된 계정은 403입니다.")
    @SecurityRequirements // 공개 API: Swagger에서 인증(자물쇠) 표시 제거
    @PostMapping("/google")
    public ApiResponse<GoogleLoginResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ApiResponse.success(authService.loginWithGoogle(request.idToken()));
    }
}