package com.murukmuruk.domain.merchant.controller;

import com.murukmuruk.domain.merchant.dto.MerchantLoginRequest;
import com.murukmuruk.domain.merchant.dto.MerchantLoginResponse;
import com.murukmuruk.domain.merchant.service.MerchantAuthService;
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

@Tag(name = "가맹점 - 가입·로그인", description = "가맹점 가입 신청과 구글 로그인입니다. 가입 후 관리자가 승인하면 ACTIVE가 됩니다.")
@RestController
@RequestMapping("/api/merchants/auth")
@RequiredArgsConstructor
public class MerchantAuthController {

    private final MerchantAuthService merchantAuthService;

    /** POST /api/merchants/auth/google : 가맹점 로그인 (SecurityConfig에서 이미 permitAll) */
    @Operation(summary = "가맹점 로그인 (구글)",
            description = "가입한 가맹점이 구글 ID 토큰으로 로그인합니다. 신청 상태(APPLIED)도 로그인할 수 있어 승인 여부를 확인할 수 있습니다. "
                    + "가입하지 않은 계정은 자동 가입하지 않고 404, 일시 정지된 가맹점은 403입니다.")
    @SecurityRequirements // 공개 API: Swagger 자물쇠 표시 제거
    @PostMapping("/google")
    public ApiResponse<MerchantLoginResponse> googleLogin(@Valid @RequestBody MerchantLoginRequest request) {
        return ApiResponse.success(merchantAuthService.login(request.idToken()));
    }
}