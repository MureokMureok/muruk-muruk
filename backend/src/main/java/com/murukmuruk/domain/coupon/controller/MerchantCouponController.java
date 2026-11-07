package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponPolicyCreateRequest;
import com.murukmuruk.domain.coupon.dto.CouponPolicyCreateResponse;
import com.murukmuruk.domain.coupon.service.CouponPolicyService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "가맹점 - 일반 쿠폰", description = "가맹점이 발행 한도 안에서 일반 쿠폰을 발행합니다. (가맹점 전용)")
@RestController
@RequestMapping("/api/merchants/me")
@RequiredArgsConstructor
public class MerchantCouponController {

    private final CouponPolicyService couponPolicyService;

    /** POST /api/merchants/me/coupon-policies : 일반 쿠폰 발행 (한도 안에서 즉시 발행) */
    @Operation(summary = "일반 쿠폰 발행",
            description = "쿠폰 규칙(할인 금액, 받는 조건, 유효 일수, 수량 등)을 정해 발행합니다. 승인된(ACTIVE) 가맹점만 가능하고, "
                    + "발행 총액(할인 금액 × 수량)이 남은 발행 한도에서 차감됩니다. 한도를 넘으면 LIMIT409입니다. 성공하면 201입니다.")
    @PostMapping("/coupon-policies")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CouponPolicyCreateResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                          @Valid @RequestBody CouponPolicyCreateRequest request) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.created(couponPolicyService.create(merchantId, request));
    }
}