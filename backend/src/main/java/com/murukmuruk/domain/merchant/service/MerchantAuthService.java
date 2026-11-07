package com.murukmuruk.domain.merchant.service;

import com.murukmuruk.domain.auth.client.GoogleIdTokenVerifier;
import com.murukmuruk.domain.auth.client.GoogleUserInfo;
import com.murukmuruk.domain.auth.enums.Role;
import com.murukmuruk.domain.auth.support.JwtTokenProvider;
import com.murukmuruk.domain.merchant.dto.MerchantLoginResponse;
import com.murukmuruk.domain.merchant.dto.MerchantSignUpRequest;
import com.murukmuruk.domain.merchant.dto.MerchantSignUpResponse;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.wallet.service.WalletProvisioner;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MerchantAuthService {

    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final MerchantRepository merchantRepository;
    private final WalletProvisioner walletProvisioner;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 가맹점 가입 신청.
     * 사용자 로그인(AuthService)과 같은 이유로 @Transactional을 안 붙였다:
     * 구글 서버 호출 동안 DB 연결을 잡고 있지 않기 위해. 저장은 save 한 번이라 트랜잭션이 따로 필요 없다.
     */
    public MerchantSignUpResponse signUp(MerchantSignUpRequest request) {
        // 1. 구글 토큰 검증 (실패하면 401)
        GoogleUserInfo googleUser = googleIdTokenVerifier.verify(request.idToken());

        // 2. 중복 확인 (users 테이블은 보지 않는다: 사용자로 가입한 계정도 가맹점 신청 가능)
        if (merchantRepository.existsByGoogleSub(googleUser.sub())) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 가맹점으로 가입한 구글 계정입니다.");
        }
        if (merchantRepository.existsByBusinessNo(request.businessNo())) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 등록된 사업자번호입니다.");
        }

        // 3. 지갑 생성. 실패하면 저장하지 않으므로 신청도 취소된다
        String walletAddress;
        try {
            walletAddress = walletProvisioner.createWalletAddress();
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "지갑 생성에 실패했습니다.", e);
        }

        // 4. 저장. 2번 확인과 저장 사이에 같은 요청이 동시에 들어오면 DB 유니크 제약이 막아 준다 → 409
        Merchant merchant;
        try {
            merchant = merchantRepository.saveAndFlush(Merchant.create(
                    googleUser.sub(), request.name(), request.category(), request.businessNo(), walletAddress));
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 가입했거나 등록된 사업자번호입니다.", e);
        }

        // 5. 가맹점 토큰 발급: sub = merchantId, role = MERCHANT (기존 메서드를 그대로 사용)
        String accessToken = jwtTokenProvider.createAccessToken(merchant.getId(), Role.MERCHANT);
        return MerchantSignUpResponse.of(accessToken, merchant);
    }

    /**
     * 가맹점 로그인.
     * 사용자 로그인과 달리 자동 가입하지 않는다: 가맹점은 업종·사업자번호가 필요해서 가입 신청 화면을 거쳐야 하기 때문.
     * APPLIED(승인 대기)도 로그인은 허용한다: 승인됐는지 확인할 수 있어야 하므로.
     */
    public MerchantLoginResponse login(String idToken) {
        // 1. 구글 토큰 검증 (실패하면 401)
        GoogleUserInfo googleUser = googleIdTokenVerifier.verify(idToken);

        // 2. 가맹점 조회. 없으면 404 → 프론트가 가입 신청 화면으로 보낸다
        Merchant merchant = merchantRepository.findByGoogleSub(googleUser.sub())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "가입 신청 내역이 없는 계정입니다."));

        // 3. 정지된 가맹점은 거부 (403)
        if (merchant.isSuspended()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "일시 정지된 가맹점입니다.");
        }

        // 4. 가맹점 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(merchant.getId(), Role.MERCHANT);
        return MerchantLoginResponse.of(accessToken, merchant);
    }
}