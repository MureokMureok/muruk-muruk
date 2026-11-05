package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponPolicyListResponse;
import com.murukmuruk.domain.coupon.service.CouponPolicyQueryService;
import com.murukmuruk.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupon-policies")
@RequiredArgsConstructor
public class CouponPolicyController {

    private final CouponPolicyQueryService couponPolicyQueryService;

    /** GET /api/coupon-policies : 지금 받을 수 있는 쿠폰 목록 (사용자 전용) */
    @GetMapping
    public ApiResponse<CouponPolicyListResponse> list(@AuthenticationPrincipal Jwt jwt,
                                                      @RequestParam(required = false) Long cursor,
                                                      @RequestParam(required = false) Integer size) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(couponPolicyQueryService.getClaimable(userId, cursor, size));
    }
}