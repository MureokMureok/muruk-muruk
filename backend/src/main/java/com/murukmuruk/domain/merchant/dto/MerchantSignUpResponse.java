package com.murukmuruk.domain.merchant.dto;

import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;

/** 가입 신청 응답. 승인 전(APPLIED)에도 바로 쓸 수 있는 토큰을 같이 준다 (승인 상태 확인용) */
public record MerchantSignUpResponse(
        String accessToken,
        Long merchantId,
        String name,
        MerchantCategory category,
        String businessNo,
        String walletAddress,
        MerchantStatus status
) {
    public static MerchantSignUpResponse of(String accessToken, Merchant merchant) {
        return new MerchantSignUpResponse(
                accessToken,
                merchant.getId(),
                merchant.getName(),
                merchant.getCategory(),
                merchant.getBusinessNo(),
                merchant.getWalletAddress(),
                merchant.getStatus());
    }
}