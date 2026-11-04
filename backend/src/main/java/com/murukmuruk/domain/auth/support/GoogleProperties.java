package com.murukmuruk.domain.auth.support;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** application.yaml의 google.* 값을 담는다 */
@ConfigurationProperties(prefix = "google")
public record GoogleProperties(String clientId) {

    public GoogleProperties {
        // 환경변수가 안 들어오면 "${GOOGLE_CLIENT_ID}" 글자가 그대로 들어오므로 여기서 걸러진다
        if (clientId == null || clientId.isBlank() || clientId.startsWith("${")) {
            throw new IllegalStateException(
                    "google.client-id가 비어 있습니다. GOOGLE_CLIENT_ID 환경변수를 확인하세요.");
        }
    }
}