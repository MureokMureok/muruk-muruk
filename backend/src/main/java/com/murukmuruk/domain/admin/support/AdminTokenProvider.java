package com.murukmuruk.domain.admin.support;

import com.murukmuruk.domain.auth.enums.Role;
import com.murukmuruk.domain.auth.support.JwtProperties;
import com.murukmuruk.domain.auth.support.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * 관리자 토큰 발급. 관리자 sub는 이메일(문자열)이라 기존 JwtTokenProvider(숫자 id 전용)를 못 쓴다.
 * 공유 파일을 고치지 않으려고 따로 뒀고, 같은 인코더·키·발급자·유효기간을 써서 기존 토큰 검증을 그대로 통과한다.
 */
@Component
@RequiredArgsConstructor
public class AdminTokenProvider {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;

    public String createAccessToken(String email) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(JwtTokenProvider.ISSUER)   // JwtConfig의 디코더가 이 발급자를 검사한다
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenTtl()))
                .subject(email)
                .claim("role", Role.ADMIN.name())  // SecurityConfig가 ROLE_ADMIN으로 바꿔 쓴다
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}