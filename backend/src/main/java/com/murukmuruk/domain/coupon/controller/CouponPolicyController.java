package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponPolicyListResponse;
import com.murukmuruk.domain.coupon.service.CouponPolicyQueryService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "소비자 - 일반 쿠폰", description = "가맹점이 발행한 일반 쿠폰을 받고, 내 쿠폰함에서 보고, 결제에 사용합니다. (소비자 전용, 목록 조회는 비회원도 가능)")
@RestController
@RequestMapping("/api/coupon-policies")
@RequiredArgsConstructor
public class CouponPolicyController {

    private final CouponPolicyQueryService couponPolicyQueryService;

    /** GET /api/coupon-policies : 지금 받을 수 있는 쿠폰 목록 (비회원도 볼 수 있다. 비회원이면 alreadyClaimed는 항상 false) */
    @Operation(summary = "받을 수 있는 일반 쿠폰 목록 (비회원 가능)",
            description = "지금 받을 수 있는 쿠폰(수량이 남아 있고 가맹점이 승인된 것)을 최신순으로 돌려줍니다. "
                    + "로그인하지 않았거나 소비자 토큰이 아니면 alreadyClaimed는 항상 false입니다. 목록은 커서 방식입니다.")
    @GetMapping
    public ApiResponse<CouponPolicyListResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "직전 응답의 nextCursor (첫 요청에는 생략)") @RequestParam(required = false) Long cursor,
            @Parameter(description = "한 번에 가져올 개수 (기본 10, 최대 50)") @RequestParam(required = false) Integer size) {
        // 비회원이거나 소비자 토큰이 아니면 userId 없이 조회한다 (alreadyClaimed는 false)
        Long userId = jwt != null && "USER".equals(jwt.getClaimAsString("role"))
                ? Long.valueOf(jwt.getSubject()) : null;
        return ApiResponse.success(couponPolicyQueryService.getClaimable(userId, cursor, size));
    }
}