package com.murukmuruk.domain.wallet.service;

/**
 * 새 사용자의 지갑을 만들어 주는 역할.
 * 지금은 임시 구현(PlaceholderWalletProvisioner)이고,
 * NHN 체인 사양이 정해지면 실제 구현으로 갈아 끼운다. (이 인터페이스를 쓰는 쪽은 안 바뀐다)
 */
public interface WalletProvisioner {

    /** 지갑 주소(0x + 16진수 40자리, 소문자)를 만들어 돌려준다. 실패하면 예외를 던진다 */
    String createWalletAddress();
}