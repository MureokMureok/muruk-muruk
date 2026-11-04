package com.murukmuruk.domain.wallet.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * 임시 구현: 랜덤으로 지갑 "모양"의 주소만 만든다.
 * 주의: 이 주소의 개인키를 가진 사람은 아무도 없다. 실제 체인에서는 쓸 수 없다.
 * 로그인/가입 흐름을 개발하기 위한 자리 채우기용이다.
 */
@Component
public class PlaceholderWalletProvisioner implements WalletProvisioner {

    private final SecureRandom random = new SecureRandom();

    @Override
    public String createWalletAddress() {
        byte[] bytes = new byte[20];          // 이더리움 주소는 20바이트
        random.nextBytes(bytes);
        return "0x" + HexFormat.of().formatHex(bytes);  // 소문자 16진수 40자리
    }
}