package com.murukmuruk.domain.admin.dto;

import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;

import java.time.LocalDateTime;

/** 상태 변경 결과. txHash는 승인(체인 등록)할 때만 있고, 정지·해제는 null */
public record MerchantStatusChangeResponse(
        Long merchantId,
        MerchantStatus status,
        LocalDateTime updatedAt,
        String txHash
) {
    public static MerchantStatusChangeResponse of(Merchant merchant, String txHash) {
        return new MerchantStatusChangeResponse(
                merchant.getId(), merchant.getStatus(), merchant.getUpdatedAt(), txHash);
    }
}