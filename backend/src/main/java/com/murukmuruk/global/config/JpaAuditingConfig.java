package com.murukmuruk.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** createdAt / updatedAt 자동 기록을 켠다 (BaseTimeEntity용) */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}