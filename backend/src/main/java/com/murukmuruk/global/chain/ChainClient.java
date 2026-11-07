package com.murukmuruk.global.chain;

import java.util.List;
import java.util.Map;

/**
 * 블록체인 호출 창구.
 * 지금은 FakeChainClient(가짜)로 개발하고, 컨트랙트(INTERFACE v3) 연결이 끝나면 진짜 구현으로 교체한다.
 * 호출이 실패하면 BusinessException(ErrorCode.CHAIN_ERROR)을 던진다.
 *
 * 위쪽 4개는 일반 쿠폰(가맹점 직접 발행) 흐름용이고,
 * 아래쪽은 컨트랙트 v3(연합 기획전)의 함수와 1:1로 맞춘 기획전 흐름용이다.
 */
public interface ChainClient {

    // ───────────── 일반 쿠폰 흐름 (컨트랙트 범위 밖, 당분간 가짜 체인) ─────────────

    /** 가맹점 지갑을 화이트리스트에 등록한다. 반환값은 txHash. */
    String registerMerchant(String merchantWalletAddress);

    /** 쿠폰 규칙을 등록한다. (컨트랙트가 발행 한도를 한 번 더 확인) 반환값은 txHash. */
    String registerCouponPolicy(long couponPolicyId, String merchantWalletAddress,
                                long discountAmount, int quantity);

    /** 사용자에게 쿠폰 NFT 1장을 발급한다. */
    MintResult mintCoupon(long couponPolicyId, String userWalletAddress);

    /** 쿠폰을 사용(소각)한다. 반환값은 txHash. */
    String burnCoupon(long tokenId, String userWalletAddress, String merchantWalletAddress);

    // ───────────── 기획전 흐름 (컨트랙트 v3) ─────────────

    /** createCampaign: 기획전 만들기 (KCP). 시각은 unix seconds. 반환값은 txHash. */
    String createCampaign(long campaignId, List<Long> merchantIds, long startsAtEpochSec, long endsAtEpochSec);

    /** registerTerms: 가게 쿠폰 조건 등록. validity는 DAYS30 또는 END. 반환값은 txHash. */
    String registerTerms(long campaignId, long merchantId, long discountAmount, long minOrderAmount,
                         String validity, long cap);

    /** setCampaignStatus: 시작 승인(ACTIVE) / 일시 중지(PAUSED) / 종료(ENDED). 반환값은 txHash. */
    String setCampaignStatus(long campaignId, String status);

    /**
     * issueForPurchase: 구매 완료 시 쿠폰 발급 (확정 대기 상태로).
     * targetMerchantIds는 백엔드가 한도를 확인해서 정한, 쿠폰을 받을 가게들이다.
     * 결과는 가게별 tokenId와 txHash.
     */
    IssueResult issueForPurchase(long campaignId, long buyMerchantId, String userWalletAddress,
                                 String orderRef, List<Long> targetMerchantIds);

    /** confirmPurchase: 구매 확정 → 쿠폰이 사용 가능해진다. 반환값은 txHash. */
    String confirmPurchase(String orderRef);

    /** cancelPurchase: 구매 확정 전 취소 → 쿠폰 무효. 반환값은 txHash. */
    String cancelPurchase(String orderRef);

    /**
     * lockForPayment: 결제 시작 → 쿠폰 잠금. 검사에 실패해도 예외를 던지지 않고 ok=false로 돌려준다.
     * (컨트랙트가 되돌리지 않고 RedeemRejected 이벤트만 남기는 방식과 같다)
     */
    LockResult lockForPayment(long tokenId, String userWalletAddress, long merchantId,
                              long orderAmount, String payRef);

    /** confirmPayment: 결제 확정 → 쿠폰 소각. 반환값은 txHash. */
    String confirmPayment(String payRef);

    /** cancelPayment: 결제 취소 → 쿠폰 복원. 반환값은 txHash. */
    String cancelPayment(String payRef);

    /** 일반 쿠폰 발급 결과: 체인 NFT 번호와 거래 해시 */
    record MintResult(long tokenId, String txHash) {
    }

    /** 기획전 쿠폰 발급 결과: 가게(merchantId)별 NFT 번호와 거래 해시 */
    record IssueResult(Map<Long, Long> tokenIdByMerchantId, String txHash) {
    }

    /** 쿠폰 잠금 결과: 성공 여부, 실패 사유, 거래 해시 */
    record LockResult(boolean ok, String reason, String txHash) {
    }
}