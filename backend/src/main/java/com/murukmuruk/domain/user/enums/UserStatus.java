package com.murukmuruk.domain.user.enums;

/** 계정 상태. SUSPENDED면 로그인 시 COMMON403 */
public enum UserStatus {
    ACTIVE,             // 활성
    SUSPENDED           // 정지
}