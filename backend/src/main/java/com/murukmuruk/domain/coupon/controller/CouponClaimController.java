package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponClaimResponse;
import com.murukmuruk.domain.coupon.service.CouponClaimService;
import com.murukmuruk.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupon-policies")
@RequiredArgsConstructor
public class CouponClaimController {

    private final CouponClaimService couponClaimService;

    /** POST /api/coupon-policies/{couponPolicyId}/claim : 쿠폰 받기 (사용자 전용) */
    @PostMapping("/{couponPolicyId}/claim")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CouponClaimResponse> claim(@AuthenticationPrincipal Jwt jwt,
                                                  @PathVariable Long couponPolicyId) {
        Long userId = Long.valueOf(jwt.getSubject()); // 사용자 토큰의 sub = userId
        return ApiResponse.created(couponClaimService.claim(userId, couponPolicyId));
    }
}