package com.murukmuruk.domain.deposit.dto;

import jakarta.validation.constraints.Min;

/** 개발용 임시 입금 요청 */
public record DevDepositRequest(
        @Min(value = 1, message = "입금액은 1원 이상이어야 합니다.") long amount
) {
}