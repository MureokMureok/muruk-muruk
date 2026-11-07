package com.murukmuruk.global.config;

import com.murukmuruk.global.security.RestAccessDeniedHandler;
import com.murukmuruk.global.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    // application.yaml의 app.cors.allowed-origins (쉼표로 구분된 주소들)
    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 쿠키/세션 없이 Authorization 헤더의 토큰만 쓰므로 CSRF 방어는 필요 없다
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ---- 토큰 없이 접근 ----
                        .requestMatchers("/api/auth/**").permitAll()                // 사용자 로그인
                        .requestMatchers(HttpMethod.POST, "/api/merchants").permitAll() // 가맹점 가입 신청
                        .requestMatchers("/api/merchants/auth/**").permitAll()      // 가맹점 로그인
                        .requestMatchers("/api/admin/auth/**").permitAll()          // 관리자 로그인
                        .requestMatchers("/actuator/health").permitAll()            // 헬스체크
                        // 비회원도 둘러볼 수 있는 화면: 기획전, 가게 상품, 구매 미리보기, 받을 수 있는 쿠폰 (조회만)
                        .requestMatchers(HttpMethod.GET, "/api/campaigns", "/api/campaigns/**",
                                "/api/merchants/*/product", "/api/merchants/*/purchase-preview",
                                "/api/coupon-policies").permitAll()
                        // Swagger 화면과 API 문서 (개발용. 배포 전에는 막아야 함)
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        // ---- 역할별 접근 (다른 역할 토큰이면 403) ----
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/merchants/me/**").hasRole("MERCHANT")
                        .requestMatchers("/api/users/**", "/api/coupons/**", "/api/me/**",
                                "/api/coupon-policies/**", "/api/orders/**").hasRole("USER")
                        .anyRequest().authenticated())                              // 나머지는 로그인 필요
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                // 들어온 Bearer 토큰을 JwtDecoder로 검증한다
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler));
        return http.build();
    }

    /** 토큰의 role 클레임(USER 등)을 ROLE_USER 권한으로 바꿔 준다 */
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    /** 프론트(Vite 5173, 3000 등)에서 호출할 수 있게 허용 */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}