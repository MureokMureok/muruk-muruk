package com.murukmuruk.domain.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.global.util.MerchantLook;
import com.murukmuruk.global.util.TimeText;

/**
 * 관리자 가맹점 목록 한 줄. status는 백엔드 값(APPLIED 심사 대기 / ACTIVE 승인 / SUSPENDED 정지) 그대로다.
 * (프론트 mock은 승인을 APPROVED로 쓰므로 ACTIVE ↔ APPROVED만 맞춰 주면 된다)
 */
public record AdminMerchantItem(
        Long id,
        String name,
        MerchantCategory category,
        String categoryLabel,
        @JsonProperty("short") String shortName, // "short"는 자바 예약어라 이름만 바꾸고 JSON 키는 short로 내보낸다
        String color,
        MerchantStatus status,
        String appliedAt,
        String bizNumber,
        String walletAddress
) {
    public static AdminMerchantItem from(Merchant m) {
        return new AdminMerchantItem(
                m.getId(), m.getName(), m.getCategory(), MerchantLook.categoryLabel(m.getCategory()),
                MerchantLook.shortName(m), MerchantLook.color(m), m.getStatus(),
                TimeText.date(m.getCreatedAt()), m.getBusinessNo(), m.getWalletAddress());
    }
}