package com.murukmuruk.domain.admin.client;

import com.murukmuruk.domain.auth.support.GoogleProperties;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

/**
 * 관리자 로그인용 구글 ID 토큰 검증.
 * 공유 파일(GoogleUserInfo, GoogleJwksIdTokenVerifier)을 고치지 않으려고 따로 뒀다.
 * 검증 규칙(서명·만료·발급자·클라이언트 ID)은 GoogleJwksIdTokenVerifier와 똑같고, 이메일만 추가로 꺼낸다.
 */
@Slf4j
@Component
public class AdminGoogleIdTokenVerifier {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> GOOGLE_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");
    private static final String DEFAULT_NAME = "관리자";

    private final JwtDecoder decoder;

    public AdminGoogleIdTokenVerifier(GoogleProperties props) {
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();

        // 발급자가 구글인지
        OAuth2TokenValidator<Jwt> issuerValidator = jwt ->
                GOOGLE_ISSUERS.contains(jwt.getClaimAsString("iss"))
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "발급자가 구글이 아닙니다.", null));

        // 우리 앱(GOOGLE_CLIENT_ID)을 위해 발급된 토큰인지
        OAuth2TokenValidator<Jwt> audienceValidator = jwt ->
                jwt.getAudience() != null && jwt.getAudience().contains(props.clientId())
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "토큰 대상(audience)이 맞지 않습니다.", null));

        nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(), issuerValidator, audienceValidator));
        this.decoder = nimbus;
    }

    /** 검증에 실패하면 401. 이메일 인증 여부는 호출하는 쪽(AdminAuthService)에서 판단한다 */
    public AdminGoogleAccount verify(String idToken) {
        try {
            Jwt jwt = decoder.decode(idToken);

            String email = jwt.getClaimAsString("email");
            String normalizedEmail = email == null ? null : email.trim().toLowerCase(Locale.ROOT);

            // email_verified는 구글이 boolean으로 보낸다. 다른 형식이면 인증 안 된 것으로 본다
            boolean emailVerified;
            try {
                emailVerified = Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"));
            } catch (IllegalArgumentException e) {
                emailVerified = false;
            }

            String name = jwt.getClaimAsString("name");
            if (name == null || name.isBlank()) {
                name = DEFAULT_NAME;
            }
            return new AdminGoogleAccount(name, normalizedEmail, emailVerified);
        } catch (JwtException e) {
            // 위조, 만료, 형식 오류, 구글 키를 못 가져온 경우 전부 여기로 온다
            log.warn("관리자 구글 ID 토큰 검증 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "구글 ID 토큰 검증에 실패했습니다.", e);
        }
    }
}