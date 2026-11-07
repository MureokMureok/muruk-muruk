package com.murukmuruk.domain.merchant.dto;

import jakarta.validation.constraints.NotBlank;

/** 가맹점 로그인 요청 */
public record MerchantLoginRequest(
        @NotBlank(message = "idToken은 필수입니다.") String idToken
) {
}