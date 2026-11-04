package com.murukmuruk.global.config;

import com.murukmuruk.domain.auth.support.JwtProperties;
import com.murukmuruk.domain.auth.support.JwtTokenProvider;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/** JWT를 만드는 인코더와 검증하는 디코더. 같은 비밀키(JWT_SECRET)를 쓴다 */
@Configuration
public class JwtConfig {

    private SecretKey secretKey(JwtProperties props) {
        return new SecretKeySpec(props.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(JwtProperties props) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey(props)));
    }

    @Bean
    public JwtDecoder jwtDecoder(JwtProperties props) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(secretKey(props))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        // 만료 시간과 발급자(issuer)를 같이 검증한다
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(JwtTokenProvider.ISSUER));
        return decoder;
    }
}