package com.murukmuruk.domain.merchant.dto;

import com.murukmuruk.domain.merchant.enums.MerchantCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 가맹점 가입 신청 요청.
 * category에 없는 값(예: COSMETICS)이 오면 JSON 변환 단계에서 실패해 COMMON400이 된다.
 */
public record MerchantSignUpRequest(
        @NotBlank(message = "idToken은 필수입니다.")
        String idToken,

        @NotBlank(message = "가게 이름은 필수입니다.")
        @Size(max = 100, message = "가게 이름은 100자 이하여야 합니다.")
        String name,

        @NotNull(message = "업종은 필수입니다.")
        MerchantCategory category,

        // DB CHECK 제약과 같은 규칙: 숫자 10자리, '-' 없이
        @NotBlank(message = "사업자번호는 필수입니다.")
        @Pattern(regexp = "^[0-9]{10}$", message = "사업자번호는 '-' 없이 숫자 10자리여야 합니다.")
        String businessNo
) {
}