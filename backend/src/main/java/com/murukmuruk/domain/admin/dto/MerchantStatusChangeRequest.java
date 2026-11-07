package com.murukmuruk.domain.admin.dto;

import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import jakarta.validation.constraints.NotNull;

/**
 * 가맹점 상태 변경 요청. ACTIVE(승인·해제) 또는 SUSPENDED(정지)만 받는다.
 * 없는 값(예: "DELETED")은 JSON 변환 단계에서, APPLIED는 서비스에서 400으로 막는다.
 */
public record MerchantStatusChangeRequest(
        @NotNull(message = "status는 필수입니다.") MerchantStatus status
) {
}