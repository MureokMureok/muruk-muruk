package com.murukmuruk.domain.auth.support;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** application.yaml의 jwt.* 값을 담는다 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(String secret, Duration accessTokenTtl) {

    public JwtProperties {
        // HS256 서명은 32바이트 이상 키가 필요하다.
        // 환경변수가 안 들어오면 "${JWT_SECRET}" 글자가 그대로 들어오므로 여기서 걸러진다.
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "jwt.secret은 32바이트(영문 32자) 이상이어야 합니다. JWT_SECRET 환경변수를 확인하세요.");
        }
        if (accessTokenTtl == null) {
            accessTokenTtl = Duration.ofHours(24);
        }
    }
}