package com.murukmuruk.domain.auth.service;

import com.murukmuruk.domain.auth.client.GoogleIdTokenVerifier;
import com.murukmuruk.domain.auth.client.GoogleUserInfo;
import com.murukmuruk.domain.auth.dto.GoogleLoginResponse;
import com.murukmuruk.domain.auth.enums.Role;
import com.murukmuruk.domain.auth.support.JwtTokenProvider;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.domain.wallet.service.WalletProvisioner;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final UserRepository userRepository;
    private final WalletProvisioner walletProvisioner;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 구글 로그인. 처음이면 가입(+지갑 생성), 이미 가입했으면 그대로 로그인한다.
     * (일부러 @Transactional을 안 붙였다: 구글 서버 호출 동안 DB 연결을 잡고 있지 않기 위해)
     */
    public GoogleLoginResponse loginWithGoogle(String idToken) {
        // 1. 구글 토큰 검증 (실패하면 401)
        GoogleUserInfo googleUser = googleIdTokenVerifier.verify(idToken);

        // 2. 구글 고유 ID(sub)로 가입한 사람인지 찾기
        Optional<User> existing = userRepository.findByGoogleSub(googleUser.sub());
        boolean isNewUser = existing.isEmpty();
        User user = existing.orElseGet(() -> signUp(googleUser));

        // 3. 정지된 계정이면 거부 (403)
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "일시 정지된 계정입니다.");
        }

        // 4. 우리 서비스의 액세스 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), Role.USER);
        return GoogleLoginResponse.of(accessToken, isNewUser, user);
    }

    /** 지갑을 먼저 만들고, 성공했을 때만 저장한다. 지갑 생성이 실패하면 가입도 되지 않는다 */
    private User signUp(GoogleUserInfo googleUser) {
        String walletAddress;
        try {
            walletAddress = walletProvisioner.createWalletAddress();
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "지갑 생성에 실패했습니다.", e);
        }
        return userRepository.save(User.create(googleUser.sub(), googleUser.name(), walletAddress));
    }
}