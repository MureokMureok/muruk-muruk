package com.murukmuruk.domain.merchant.controller;

import com.murukmuruk.domain.merchant.dto.MerchantSignUpRequest;
import com.murukmuruk.domain.merchant.dto.MerchantSignUpResponse;
import com.murukmuruk.domain.merchant.service.MerchantAuthService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantAuthService merchantAuthService;

    /** POST /api/merchants : 가맹점 가입 신청 (SecurityConfig에서 이미 permitAll) */
    @SecurityRequirements // 공개 API: Swagger 자물쇠 표시 제거 (AuthController와 같은 방식)
    @ResponseStatus(HttpStatus.CREATED) // 생성이라 HTTP 201
    @PostMapping
    public ApiResponse<MerchantSignUpResponse> signUp(@Valid @RequestBody MerchantSignUpRequest request) {
        return ApiResponse.created(merchantAuthService.signUp(request));
    }
}