package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponPolicyCreateRequest;
import com.murukmuruk.domain.coupon.dto.CouponPolicyCreateResponse;
import com.murukmuruk.domain.coupon.service.CouponPolicyService;
import com.murukmuruk.global.response.ApiResponse;
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

@RestController
@RequestMapping("/api/merchants/me")
@RequiredArgsConstructor
public class MerchantCouponController {

    private final CouponPolicyService couponPolicyService;

    /** POST /api/merchants/me/coupon-policies : 일반 쿠폰 발행 (한도 안에서 즉시 발행) */
    @PostMapping("/coupon-policies")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CouponPolicyCreateResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                          @Valid @RequestBody CouponPolicyCreateRequest request) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.created(couponPolicyService.create(merchantId, request));
    }
}