package com.murukmuruk.domain.admin.service;

import com.murukmuruk.domain.admin.client.AdminGoogleAccount;
import com.murukmuruk.domain.admin.client.AdminGoogleIdTokenVerifier;
import com.murukmuruk.domain.admin.dto.AdminLoginResponse;
import com.murukmuruk.domain.admin.support.AdminTokenProvider;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AdminAuthService {

    private final AdminGoogleIdTokenVerifier verifier;
    private final AdminTokenProvider adminTokenProvider;
    private final Set<String> adminEmails;

    /**
     * 허용 이메일 목록은 환경변수로만 받는다 (저장소가 Public이라 yaml·코드에 실제 이메일을 쓰지 않음).
     * application.yaml을 고치지 않으려고 환경변수 ADMIN_EMAILS를 바로 읽는다.
     * 나중에 yaml에 app.admin.emails가 생기면 그 값을 먼저 쓴다.
     */
    public AdminAuthService(AdminGoogleIdTokenVerifier verifier,
                            AdminTokenProvider adminTokenProvider,
                            @Value("${app.admin.emails:${ADMIN_EMAILS:}}") String adminEmails) {
        this.verifier = verifier;
        this.adminTokenProvider = adminTokenProvider;
        this.adminEmails = Arrays.stream(adminEmails.split(","))
                .map(email -> email.trim().toLowerCase(Locale.ROOT)) // 대소문자 구분 없이 비교
                .filter(email -> !email.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        if (this.adminEmails.isEmpty()) {
            log.warn("ADMIN_EMAILS가 비어 있어 관리자 로그인이 모두 거절됩니다.");
        }
    }

    /** 관리자 로그인. DB에 저장하지 않고, 이메일이 허용 목록에 있는지만 본다 */
    public AdminLoginResponse login(String idToken) {
        // 1. 구글 토큰 검증 (실패하면 401)
        AdminGoogleAccount account = verifier.verify(idToken);

        // 2. 구글이 인증한 이메일만 믿는다 (인증 안 된 이메일은 남의 주소일 수 있음)
        if (!account.emailVerified() || account.email() == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "이메일 인증이 완료되지 않은 구글 계정입니다.");
        }

        // 3. 허용 목록 확인 (403). 이메일은 비교에만 쓰고 저장하지 않는다
        if (!adminEmails.contains(account.email())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "관리자 권한이 없는 계정입니다.");
        }

        // 4. 관리자 토큰 발급: sub = 이메일(소문자), role = ADMIN
        String accessToken = adminTokenProvider.createAccessToken(account.email());
        return new AdminLoginResponse(accessToken, account.name(), account.email());
    }
}