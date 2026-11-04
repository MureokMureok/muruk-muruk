package com.murukmuruk.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.murukmuruk.domain.user.entity.User;

public record GoogleLoginResponse(
        String accessToken,
        @JsonProperty("isNewUser") boolean isNewUser,   // JSON 필드 이름을 isNewUser로 고정
        Long userId,
        String name,
        String walletAddress
) {
    public static GoogleLoginResponse of(String accessToken, boolean isNewUser, User user) {
        return new GoogleLoginResponse(
                accessToken, isNewUser, user.getId(), user.getName(), user.getWalletAddress());
    }
}