package com.murukmuruk.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;

/** 관리자 로그인 요청 */
public record AdminLoginRequest(
        @NotBlank(message = "idToken은 필수입니다.") String idToken
) {
}