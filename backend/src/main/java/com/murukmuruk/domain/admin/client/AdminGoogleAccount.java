package com.murukmuruk.domain.admin.client;

/** 관리자 판별에 필요한 구글 계정 정보. emailVerified가 false면 이메일을 믿을 수 없다 */
public record AdminGoogleAccount(String name, String email, boolean emailVerified) {
}