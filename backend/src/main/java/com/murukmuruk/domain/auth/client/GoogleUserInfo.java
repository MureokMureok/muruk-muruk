package com.murukmuruk.domain.auth.client;

/** 구글 ID 토큰에서 꺼낸 사용자 정보. sub는 구글 계정의 고유 ID */
public record GoogleUserInfo(String sub, String name) {
}