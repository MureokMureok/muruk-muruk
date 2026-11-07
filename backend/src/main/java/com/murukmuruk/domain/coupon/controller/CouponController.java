package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponDetailResponse;
import com.murukmuruk.domain.coupon.dto.CouponListResponse;
import com.murukmuruk.domain.coupon.dto.CouponUseRequest;
import com.murukmuruk.domain.coupon.dto.CouponUseResponse;
import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.coupon.service.CouponQueryService;
import com.murukmuruk.domain.coupon.service.CouponUseService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "소비자 - 일반 쿠폰", description = "가맹점이 발행한 일반 쿠폰을 받고, 내 쿠폰함에서 보고, 결제에 사용합니다. (소비자 전용, 목록 조회는 비회원도 가능)")
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponQueryService couponQueryService;
    private final CouponUseService couponUseService;

    /** GET /api/coupons : 내 쿠폰함 (사용자 전용) */
    @Operation(summary = "내 쿠폰함 (일반 쿠폰)",
            description = "내가 가진 쿠폰을 최신 발급순으로 돌려줍니다. status로 거를 수 있고, 목록은 커서 방식입니다. "
                    + "기획전 화면에서 쓰는 쿠폰 모양은 GET /api/me/coupons 입니다.")
    @GetMapping
    public ApiResponse<CouponListResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "쿠폰 상태로 거르기 (생략하면 전체)") @RequestParam(required = false) CouponStatus status,
            @Parameter(description = "직전 응답의 nextCursor (첫 요청에는 생략)") @RequestParam(required = false) Long cursor,
            @Parameter(description = "한 번에 가져올 개수 (기본 10, 최대 50)") @RequestParam(required = false) Integer size) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(couponQueryService.getMyCoupons(userId, status, cursor, size));
    }

    /** GET /api/coupons/{couponId} : 쿠폰 상세 (내 쿠폰만) */
    @Operation(summary = "쿠폰 상세", description = "내 쿠폰 한 장의 상세 정보입니다. 남의 쿠폰이면 조회할 수 없습니다.")
    @GetMapping("/{couponId}")
    public ApiResponse<CouponDetailResponse> detail(@AuthenticationPrincipal Jwt jwt,
                                                    @PathVariable Long couponId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(couponQueryService.getCoupon(userId, couponId));
    }

    /** POST /api/coupons/{couponId}/use : 쿠폰 사용 (200) */
    @Operation(summary = "일반 쿠폰 사용",
            description = "일반 쿠폰을 결제에 적용해 사용합니다. 소유자, 유효기간, 최소 주문 금액, 사용 가능 가맹점, 미사용 상태를 확인합니다. "
                    + "기획전 쿠폰은 이 API로 쓸 수 없고 POST /api/orders (couponId 포함)로 사용합니다.")
    @PostMapping("/{couponId}/use")
    public ApiResponse<CouponUseResponse> use(@AuthenticationPrincipal Jwt jwt,
                                              @PathVariable Long couponId,
                                              @RequestBody CouponUseRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(couponUseService.use(userId, couponId, request));
    }
}