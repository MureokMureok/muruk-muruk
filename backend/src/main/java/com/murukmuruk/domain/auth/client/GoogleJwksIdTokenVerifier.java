package com.murukmuruk.domain.auth.client;

import com.murukmuruk.domain.auth.support.GoogleProperties;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * 구글이 공개한 키(JWKS)로 ID 토큰의 서명을 확인하고,
 * 만료 시간 / 발급자 / 대상(우리 앱의 클라이언트 ID)까지 검증한다.
 */
@Slf4j
@Component
public class GoogleJwksIdTokenVerifier implements GoogleIdTokenVerifier {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> GOOGLE_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");
    private static final String DEFAULT_NAME = "구글 사용자";
    private static final int NAME_MAX_LENGTH = 50; // users.name 컬럼 길이

    private final JwtDecoder decoder;

    public GoogleJwksIdTokenVerifier(GoogleProperties props) {
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

        // JwtTimestampValidator: 만료/시작 시간 확인
        nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(), issuerValidator, audienceValidator));
        this.decoder = nimbus;
    }

    @Override
    public GoogleUserInfo verify(String idToken) {
        try {
            Jwt jwt = decoder.decode(idToken);

            String sub = jwt.getSubject();
            if (sub == null || sub.isBlank()) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "구글 ID 토큰에 사용자 정보가 없습니다.");
            }

            String name = jwt.getClaimAsString("name");
            if (name == null || name.isBlank()) {
                name = DEFAULT_NAME;
            }
            if (name.length() > NAME_MAX_LENGTH) {
                name = name.substring(0, NAME_MAX_LENGTH);
            }
            return new GoogleUserInfo(sub, name);
        } catch (JwtException e) {
            // 위조, 만료, 형식 오류, 구글 키를 못 가져온 경우 전부 여기로 온다
            log.warn("구글 ID 토큰 검증 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "구글 ID 토큰 검증에 실패했습니다.", e);
        }
    }
}