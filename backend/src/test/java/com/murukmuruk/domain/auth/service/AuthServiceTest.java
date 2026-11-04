package com.murukmuruk.domain.auth.service;

import com.murukmuruk.domain.auth.client.GoogleIdTokenVerifier;
import com.murukmuruk.domain.auth.client.GoogleUserInfo;
import com.murukmuruk.domain.auth.dto.GoogleLoginResponse;
import com.murukmuruk.domain.auth.enums.Role;
import com.murukmuruk.domain.auth.support.JwtTokenProvider;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.enums.UserStatus;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.domain.wallet.service.WalletProvisioner;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private static final String WALLET = "0x" + "a".repeat(40);

    private final GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final WalletProvisioner walletProvisioner = mock(WalletProvisioner.class);
    private final JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
    private final AuthService authService =
            new AuthService(verifier, userRepository, walletProvisioner, jwtTokenProvider);

    /** DB 없이 쓰는 테스트용 사용자 (id를 직접 넣는다) */
    private User savedUser() {
        User user = User.create("sub-1", "지민", WALLET);
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    @Test
    void 처음_로그인하면_가입시키고_지갑을_만든다() {
        when(verifier.verify("id-token")).thenReturn(new GoogleUserInfo("sub-1", "지민"));
        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.empty());
        when(walletProvisioner.createWalletAddress()).thenReturn(WALLET);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", 1L);
            return u;
        });
        when(jwtTokenProvider.createAccessToken(1L, Role.USER)).thenReturn("access-token");

        GoogleLoginResponse response = authService.loginWithGoogle("id-token");

        assertTrue(response.isNewUser());
        assertEquals("access-token", response.accessToken());
        assertEquals(1L, response.userId());
        assertEquals("지민", response.name());
        assertEquals(WALLET, response.walletAddress());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void 이미_가입한_사람은_지갑을_새로_만들지_않는다() {
        when(verifier.verify("id-token")).thenReturn(new GoogleUserInfo("sub-1", "지민"));
        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.of(savedUser()));
        when(jwtTokenProvider.createAccessToken(1L, Role.USER)).thenReturn("access-token");

        GoogleLoginResponse response = authService.loginWithGoogle("id-token");

        assertFalse(response.isNewUser());
        assertEquals(WALLET, response.walletAddress());
        verify(walletProvisioner, never()).createWalletAddress();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void 정지된_계정은_403이다() {
        User suspended = savedUser();
        ReflectionTestUtils.setField(suspended, "status", UserStatus.SUSPENDED);
        when(verifier.verify("id-token")).thenReturn(new GoogleUserInfo("sub-1", "지민"));
        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.of(suspended));

        BusinessException e = assertThrows(BusinessException.class,
                () -> authService.loginWithGoogle("id-token"));

        assertEquals(ErrorCode.FORBIDDEN, e.getErrorCode());
        verify(jwtTokenProvider, never()).createAccessToken(any(), any());
    }

    @Test
    void 지갑_생성에_실패하면_가입도_되지_않는다() {
        when(verifier.verify("id-token")).thenReturn(new GoogleUserInfo("sub-1", "지민"));
        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.empty());
        when(walletProvisioner.createWalletAddress()).thenThrow(new IllegalStateException("체인 오류"));

        BusinessException e = assertThrows(BusinessException.class,
                () -> authService.loginWithGoogle("id-token"));

        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, e.getErrorCode());
        verify(userRepository, never()).save(any(User.class));
    }
}