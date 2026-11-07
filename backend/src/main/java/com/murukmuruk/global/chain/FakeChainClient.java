package com.murukmuruk.global.chain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
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

    // ───────────── 기획전 흐름 ─────────────

    @Override
    public String createCampaign(long campaignId, List<Long> merchantIds, long startsAtEpochSec, long endsAtEpochSec) {
        log.info("[FakeChain] 기획전 만들기 campaignId={} merchants={} endsAt={}", campaignId, merchantIds, endsAtEpochSec);
        return randomTxHash();
    }

    @Override
    public String registerTerms(long campaignId, long merchantId, long discountAmount, long minOrderAmount,
                                String validity, long cap) {
        log.info("[FakeChain] 쿠폰 조건 등록 campaignId={} merchantId={} discount={} minOrder={} validity={} cap={}",
                campaignId, merchantId, discountAmount, minOrderAmount, validity, cap);
        return randomTxHash();
    }

    @Override
    public String setCampaignStatus(long campaignId, String status) {
        log.info("[FakeChain] 기획전 상태 변경 campaignId={} status={}", campaignId, status);
        return randomTxHash();
    }

    @Override
    public IssueResult issueForPurchase(long campaignId, long buyMerchantId, String userWalletAddress,
                                        String orderRef, List<Long> targetMerchantIds) {
        Map<Long, Long> tokens = new HashMap<>();
        for (Long merchantId : targetMerchantIds) {
            tokens.put(merchantId, tokenSequence.incrementAndGet());
        }
        log.info("[FakeChain] 구매 발급 campaignId={} buy={} to={} orderRef={} tokens={}",
                campaignId, buyMerchantId, userWalletAddress, orderRef, tokens);
        return new IssueResult(tokens, randomTxHash());
    }

    @Override
    public String confirmPurchase(String orderRef) {
        log.info("[FakeChain] 구매 확정 orderRef={}", orderRef);
        return randomTxHash();
    }

    @Override
    public String cancelPurchase(String orderRef) {
        log.info("[FakeChain] 구매 취소 orderRef={}", orderRef);
        return randomTxHash();
    }

    @Override
    public LockResult lockForPayment(long tokenId, String userWalletAddress, long merchantId,
                                     long orderAmount, String payRef) {
        log.info("[FakeChain] 쿠폰 잠금 tokenId={} user={} merchantId={} amount={} payRef={}",
                tokenId, userWalletAddress, merchantId, orderAmount, payRef);
        return new LockResult(true, null, randomTxHash());
    }

    @Override
    public String confirmPayment(String payRef) {
        log.info("[FakeChain] 결제 확정(쿠폰 소각) payRef={}", payRef);
        return randomTxHash();
    }

    @Override
    public String cancelPayment(String payRef) {
        log.info("[FakeChain] 결제 취소(쿠폰 복원) payRef={}", payRef);
        return randomTxHash();
    }

    /** "0x" + 무작위 16진수 64자리 (실제 거래 해시와 같은 모양) */
    private String randomTxHash() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return "0x" + HexFormat.of().formatHex(bytes);
    }
}