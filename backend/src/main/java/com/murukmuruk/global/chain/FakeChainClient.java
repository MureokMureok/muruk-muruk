package com.murukmuruk.global.chain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicLong;

/** 실제 체인을 부르지 않고 그럴듯한 값만 돌려주는 가짜 구현 (개발·시연용) */
@Slf4j
@Component
public class FakeChainClient implements ChainClient {

    private static final SecureRandom RANDOM = new SecureRandom();

    // 토큰 번호는 DB에서 중복 불가이므로, 서버를 다시 켜도 겹치지 않게 현재 시각(밀리초)에서 시작한다
    private final AtomicLong tokenSequence = new AtomicLong(System.currentTimeMillis());

    @Override
    public String registerMerchant(String merchantWalletAddress) {
        log.info("[FakeChain] 가맹점 화이트리스트 등록 wallet={}", merchantWalletAddress);
        return randomTxHash();
    }

    @Override
    public String registerCouponPolicy(long couponPolicyId, String merchantWalletAddress,
                                       long discountAmount, int quantity) {
        log.info("[FakeChain] 쿠폰 규칙 등록 policyId={} discount={} quantity={}",
                couponPolicyId, discountAmount, quantity);
        return randomTxHash();
    }

    @Override
    public MintResult mintCoupon(long couponPolicyId, String userWalletAddress) {
        long tokenId = tokenSequence.incrementAndGet();
        log.info("[FakeChain] 쿠폰 발급 policyId={} tokenId={} to={}",
                couponPolicyId, tokenId, userWalletAddress);
        return new MintResult(tokenId, randomTxHash());
    }

    @Override
    public String burnCoupon(long tokenId, String userWalletAddress, String merchantWalletAddress) {
        log.info("[FakeChain] 쿠폰 소각 tokenId={} user={} merchant={}",
                tokenId, userWalletAddress, merchantWalletAddress);
        return randomTxHash();
    }

    /** "0x" + 무작위 16진수 64자리 (실제 거래 해시와 같은 모양) */
    private String randomTxHash() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return "0x" + HexFormat.of().formatHex(bytes);
    }
}