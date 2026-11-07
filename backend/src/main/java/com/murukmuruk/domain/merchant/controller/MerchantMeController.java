package com.murukmuruk.domain.merchant.controller;

import com.murukmuruk.domain.merchant.dto.MerchantMeResponse;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 가맹점: 내 가게 정보. /api/merchants/me/** 는 ROLE_MERCHANT만 (SecurityConfig) */
@Tag(name = "가맹점 - 내 가게", description = "로그인한 가맹점 자신의 정보입니다. (가맹점 전용)")
@RestController
@RequestMapping("/api/merchants/me")
@RequiredArgsConstructor
public class MerchantMeController {

    private final MerchantRepository merchantRepository;

    @Operation(summary = "내 가게 정보",
            description = "가게 이름, 업종, 상태(APPLIED 심사 중 / ACTIVE 승인 / SUSPENDED 정지 / REJECTED 반려)를 돌려줍니다.")
    @GetMapping
    public ApiResponse<MerchantMeResponse> me(@AuthenticationPrincipal Jwt jwt) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(MerchantMeResponse.from(merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND))));
    }
}