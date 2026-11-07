package com.murukmuruk.domain.merchant.controller;

import com.murukmuruk.domain.merchant.dto.MerchantSignUpRequest;
import com.murukmuruk.domain.merchant.dto.MerchantSignUpResponse;
import com.murukmuruk.domain.merchant.service.MerchantAuthService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "가맹점 - 가입·로그인", description = "가맹점 가입 신청과 구글 로그인입니다. 가입 후 관리자가 승인하면 ACTIVE가 됩니다.")
@RestController
@RequestMapping("/api/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantAuthService merchantAuthService;

    /** POST /api/merchants : 가맹점 가입 신청 (SecurityConfig에서 이미 permitAll) */
    @Operation(summary = "가맹점 가입 신청",
            description = "구글 계정으로 가맹점을 신청합니다. 지갑이 자동으로 만들어지고 상태는 APPLIED(심사 대기)입니다. "
                    + "관리자가 승인하면 ACTIVE가 됩니다. 이미 가입한 구글 계정이나 이미 등록된 사업자번호는 409, 성공하면 201입니다.")
    @SecurityRequirements // 공개 API: Swagger 자물쇠 표시 제거 (AuthController와 같은 방식)
    @ResponseStatus(HttpStatus.CREATED) // 생성이라 HTTP 201
    @PostMapping
    public ApiResponse<MerchantSignUpResponse> signUp(@Valid @RequestBody MerchantSignUpRequest request) {
        return ApiResponse.created(merchantAuthService.signUp(request));
    }
}