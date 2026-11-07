package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.enums.UsableScope;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 쿠폰 발행 요청 (명세 6번). null 허용 필드는 @Min만 걸어서 값이 있을 때만 검사한다. */
public record CouponPolicyCreateRequest(
        @NotBlank(message = "쿠폰명은 필수입니다.")
        @Size(max = 100, message = "쿠폰명은 100자 이하여야 합니다.")
        String name,

        @NotNull(message = "할인 금액은 필수입니다.")
        @Min(value = 1, message = "할인 금액은 1원 이상이어야 합니다.")
        Long discountAmount,

        @NotNull(message = "받는 조건은 필수입니다.")
        ReceiveType receiveType,

        @Min(value = 1, message = "기준 금액은 1원 이상이어야 합니다.")
        Long receiveAmount, // MIN_AMOUNT일 때만 필수

        @Min(value = 0, message = "최소 주문 금액은 0원 이상이어야 합니다.")
        Long minOrderAmount, // 생략하면 0

        @NotNull(message = "유효 일수는 필수입니다.")
        @Min(value = 1, message = "유효 일수는 1일 이상이어야 합니다.")
        Integer validDays,

        @NotNull(message = "사용처는 필수입니다.")
        UsableScope usableScope,

        @NotNull(message = "발행 수량은 필수입니다.")
        @Min(value = 1, message = "발행 수량은 1장 이상이어야 합니다.")
        Integer quantity
) {
}