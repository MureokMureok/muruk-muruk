package com.murukmuruk.domain.auth.support;

import com.murukmuruk.domain.auth.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** 우리 서비스의 액세스 토큰(JWT)을 만든다 */
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    public static final String ISSUER = "muruk-muruk";

    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;

    /** userId를 subject로, 역할을 role 클레임으로 담아 토큰 문자열을 만든다 */
    public String createAccessToken(Long userId, Role role) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenTtl()))
                .subject(String.valueOf(userId))
                .claim("role", role.name())
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}