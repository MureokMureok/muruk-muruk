package com.murukmuruk.domain.merchant.dto;

import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;

/** 가맹점 콘솔 상단에 보여 줄 내 가게 정보 */
public record MerchantMeResponse(
        long id,
        String name,
        MerchantCategory category,
        MerchantStatus status   // APPLIED / ACTIVE / SUSPENDED / REJECTED
) {
    public static MerchantMeResponse from(Merchant m) {
        return new MerchantMeResponse(m.getId(), m.getName(), m.getCategory(), m.getStatus());
    }
}