package com.murukmuruk.domain.merchant.dto;

import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;

/** 가맹점 로그인 응답. status로 프론트가 승인 대기(APPLIED) 화면을 보여줄지 정한다 */
public record MerchantLoginResponse(
        String accessToken,
        Long merchantId,
        String name,
        MerchantStatus status
) {
    public static MerchantLoginResponse of(String accessToken, Merchant merchant) {
        return new MerchantLoginResponse(accessToken, merchant.getId(), merchant.getName(), merchant.getStatus());
    }
}