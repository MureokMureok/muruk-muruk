package com.murukmuruk.domain.admin.dto;

/** 관리자 로그인 응답. 관리자는 DB에 없으므로 id 대신 이메일을 돌려준다 */
public record AdminLoginResponse(
        String accessToken,
        String name,
        String email
) {
}