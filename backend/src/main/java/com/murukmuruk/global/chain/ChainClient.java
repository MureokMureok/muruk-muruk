package com.murukmuruk.global.chain;

/**
 * 블록체인 호출 창구.
 * 지금은 FakeChainClient(가짜)로 개발하고, NHN 체인과 컨트랙트 ABI가 나오면 진짜 구현으로 교체한다.
 * 호출이 실패하면 BusinessException(ErrorCode.CHAIN_ERROR)을 던진다.
 */
public interface ChainClient {

    /** 가맹점 지갑을 화이트리스트에 등록한다. 반환값은 txHash. */
    String registerMerchant(String merchantWalletAddress);

    /** 쿠폰 규칙을 등록한다. (컨트랙트가 발행 한도를 한 번 더 확인) 반환값은 txHash. */
    String registerCouponPolicy(long couponPolicyId, String merchantWalletAddress,
                                long discountAmount, int quantity);

    /** 사용자에게 쿠폰 NFT 1장을 발급한다. */
    MintResult mintCoupon(long couponPolicyId, String userWalletAddress);

    /** 쿠폰을 사용(소각)한다. 반환값은 txHash. */
    String burnCoupon(long tokenId, String userWalletAddress, String merchantWalletAddress);

    /** 발급 결과: 체인 NFT 번호와 거래 해시 */
    record MintResult(long tokenId, String txHash) {
    }
}