package com.murukmuruk.domain.order.controller;

import com.murukmuruk.domain.order.dto.CancelResponse;
import com.murukmuruk.domain.order.dto.ConfirmResponse;
import com.murukmuruk.domain.order.dto.OrderRequest;
import com.murukmuruk.domain.order.service.OrderStatusService;
import com.murukmuruk.domain.order.service.PurchaseService;
import com.murukmuruk.domain.order.service.RedeemService;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 소비자 주문. /api/orders/** 는 ROLE_USER만 (SecurityConfig) */
@Tag(name = "소비자 - 주문", description = "구매, 결제에 쿠폰 적용, 구매 확정, 취소·환불입니다. (소비자 전용)")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final PurchaseService purchaseService;
    private final RedeemService redeemService;
    private final OrderStatusService orderStatusService;

    @Operation(summary = "구매 / 결제에 쿠폰 적용",
            description = "couponId 없이 merchantId만 보내면 구매입니다. 모의 결제 후 다른 참여 가게의 쿠폰이 발급되고(LOCKED, 201), "
                    + "수량이 소진된 쿠폰은 missedCoupons로 알려 줍니다. "
                    + "couponId를 함께 보내면 이 가게 결제에 쿠폰을 적용합니다(쿠폰이 PROCESSING으로 잠기고 200). "
                    + "구매 확정 전 쿠폰은 COUPON_LOCKED, 다른 가게 쿠폰은 WRONG_MERCHANT, 이미 쓴 쿠폰은 COUPON_ALREADY_USED입니다.")
    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal Jwt jwt, @RequestBody OrderRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        if (request == null || request.merchantId() == null) {
            throw new BusinessException(ErrorCode.INVALID);
        }
        if (request.couponId() == null) {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created(purchaseService.purchase(userId, request.merchantId())));
        }
        return ResponseEntity.ok(
                ApiResponse.success(redeemService.redeem(userId, request.merchantId(), request.couponId())));
    }

    @Operation(summary = "구매 확정",
            description = "구매 주문을 확정하면 받은 쿠폰이 사용 가능(AVAILABLE)해집니다. "
                    + "쿠폰을 적용한 주문을 확정하면 그 쿠폰이 사용 완료(USED)됩니다.")
    @PostMapping("/{orderId}/confirm")
    public ApiResponse<ConfirmResponse> confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable Long orderId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(orderStatusService.confirm(userId, orderId));
    }

    @Operation(summary = "주문 취소·환불",
            description = "확정 전 구매를 취소하면 받은 쿠폰이 무효(VOIDED)가 되고 그 가게의 발급 수가 되돌아갑니다. "
                    + "쿠폰을 적용한 주문을 취소하면 쿠폰이 사용 가능으로 돌아옵니다. "
                    + "이미 확정된 구매는 단순 변심으로 취소할 수 없습니다(ORDER_CONFIRMED).")
    @PostMapping("/{orderId}/cancel")
    public ApiResponse<CancelResponse> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long orderId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.success(orderStatusService.cancel(userId, orderId));
    }
}