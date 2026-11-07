package com.murukmuruk.domain.coupon.controller;

import com.murukmuruk.domain.coupon.dto.CouponHistoryItem;
import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.dto.MySummaryResponse;
import com.murukmuruk.domain.coupon.service.MyCouponService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 소비자 MY 화면용 조회. /api/me/** 는 ROLE_USER만 (SecurityConfig).
 * 기존 /api/coupons 는 일반 쿠폰 명세 그대로 두고, 기획전 화면용 모양은 /api/me 아래에 둔다.
 */
@Tag(name = "소비자 - MY", description = "내 쿠폰, 쿠폰 이력, MY 요약입니다. (소비자 전용)")
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MyCouponController {

    private final MyCouponService myCouponService;

    @Operation(summary = "내 쿠폰 전체",
            description = "받은 쿠폰을 최신 발급순으로 돌려줍니다. status는 LOCKED(구매 확정 대기) / AVAILABLE(사용 가능) / "
                    + "PROCESSING(결제 처리 중) / USED(사용 완료) / VOIDED(무효) / EXPIRED(만료)입니다.")
    @GetMapping("/coupons")
    public ApiResponse<List<CouponViewItem>> list(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(myCouponService.list(userId));
    }

    @Operation(summary = "쿠폰 한 장", description = "내 쿠폰 한 장의 상세입니다. 남의 쿠폰이면 NOT_OWNER.")
    @GetMapping("/coupons/{couponId}")
    public ApiResponse<CouponViewItem> detail(@AuthenticationPrincipal Jwt jwt, @PathVariable Long couponId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(myCouponService.detail(userId, couponId));
    }

    @Operation(summary = "쿠폰 이력",
            description = "이 쿠폰의 발급·확정·적용·사용·환불·거절 기록을 오래된 순으로 돌려줍니다. "
                    + "거절 기록에는 reason(에러 코드)과 couponStatus(그때 쿠폰 상태)가 있어 \"재사용 시도\"를 구분할 수 있습니다.")
    @GetMapping("/coupons/{couponId}/history")
    public ApiResponse<List<CouponHistoryItem>> history(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long couponId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(myCouponService.history(userId, couponId));
    }

    @Operation(summary = "MY 요약",
            description = "받은 쿠폰 수(취소로 무효가 된 것 제외), 사용한 쿠폰 수, 아낀 금액(구매 확정된 주문의 할인 합계)입니다.")
    @GetMapping("/summary")
    public ApiResponse<MySummaryResponse> summary(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(myCouponService.summary(userId));
    }
}