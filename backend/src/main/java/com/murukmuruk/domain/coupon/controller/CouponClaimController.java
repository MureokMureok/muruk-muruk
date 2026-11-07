package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponClaimResponse;
import com.murukmuruk.domain.coupon.service.CouponClaimService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "소비자 - 일반 쿠폰", description = "가맹점이 발행한 일반 쿠폰을 받고, 내 쿠폰함에서 보고, 결제에 사용합니다. (소비자 전용, 목록 조회는 비회원도 가능)")
@RestController
@RequestMapping("/api/coupon-policies")
@RequiredArgsConstructor
public class CouponClaimController {

    private final CouponClaimService couponClaimService;

    /** POST /api/coupon-policies/{couponPolicyId}/claim : 쿠폰 받기 (사용자 전용) */
    @Operation(summary = "일반 쿠폰 받기",
            description = "받을 수 있는 쿠폰을 내 쿠폰함에 담습니다. 같은 쿠폰은 한 사람이 한 장만 받을 수 있고, "
                    + "수량이 모두 소진됐으면 받을 수 없습니다. 성공하면 201입니다.")
    @PostMapping("/{couponPolicyId}/claim")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CouponClaimResponse> claim(@AuthenticationPrincipal Jwt jwt,
                                                  @PathVariable Long couponPolicyId) {
        Long userId = Long.valueOf(jwt.getSubject()); // 사용자 토큰의 sub = userId
        return ApiResponse.created(couponClaimService.claim(userId, couponPolicyId));
    }
}