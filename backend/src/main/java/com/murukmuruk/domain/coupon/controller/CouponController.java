package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponDetailResponse;
import com.murukmuruk.domain.coupon.dto.CouponListResponse;
import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.coupon.service.CouponQueryService;
import com.murukmuruk.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponQueryService couponQueryService;

    /** GET /api/coupons : 내 쿠폰함 (사용자 전용) */
    @GetMapping
    public ApiResponse<CouponListResponse> list(@AuthenticationPrincipal Jwt jwt,
                                                @RequestParam(required = false) CouponStatus status,
                                                @RequestParam(required = false) Long cursor,
                                                @RequestParam(required = false) Integer size) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(couponQueryService.getMyCoupons(userId, status, cursor, size));
    }

    /** GET /api/coupons/{couponId} : 쿠폰 상세 (내 쿠폰만) */
    @GetMapping("/{couponId}")
    public ApiResponse<CouponDetailResponse> detail(@AuthenticationPrincipal Jwt jwt,
                                                    @PathVariable Long couponId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(couponQueryService.getCoupon(userId, couponId));
    }
}