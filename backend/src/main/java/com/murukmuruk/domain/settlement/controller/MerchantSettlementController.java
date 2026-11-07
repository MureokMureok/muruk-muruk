package com.murukmuruk.domain.settlement.controller;

import com.murukmuruk.domain.settlement.dto.SettlementListResponse;
import com.murukmuruk.domain.settlement.service.SettlementService;
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

@Tag(name = "가맹점 - 정산", description = "우리 가게에서 쿠폰이 사용된 내역과 할인 금액을 봅니다. (가맹점 전용)")
@RestController
@RequestMapping("/api/merchants/me/settlements")
@RequiredArgsConstructor
public class MerchantSettlementController {

    private final SettlementService settlementService;

    /** GET /api/merchants/me/settlements : 쿠폰 사용(정산) 내역 (가맹점 전용) */
    @Operation(summary = "쿠폰 사용(정산) 내역",
            description = "우리 가게에서 쿠폰을 사용해 결제된 주문을 사용 시각 최신순으로 돌려줍니다. "
                    + "일반 쿠폰과 기획전 쿠폰의 할인 금액 합계(summary)가 함께 나옵니다. 기획전 쿠폰은 구매가 확정된 주문만 포함되고, "
                    + "고객 이름은 첫 글자만 보이게 가립니다. 목록은 커서 방식입니다.")
    @GetMapping
    public ApiResponse<SettlementListResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "직전 응답의 nextCursor (첫 요청에는 생략)") @RequestParam(required = false) Long cursor,
            @Parameter(description = "한 번에 가져올 개수 (기본 10, 최대 50)") @RequestParam(required = false) Integer size) {
        Long merchantId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(settlementService.getSettlements(merchantId, cursor, size));
    }
}