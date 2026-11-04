package com.murukmuruk.domain.auth.client;

public interface GoogleIdTokenVerifier {

    /** 구글 ID 토큰을 검증하고 사용자 정보를 돌려준다. 검증에 실패하면 401(BusinessException)을 던진다 */
    GoogleUserInfo verify(String idToken);
}