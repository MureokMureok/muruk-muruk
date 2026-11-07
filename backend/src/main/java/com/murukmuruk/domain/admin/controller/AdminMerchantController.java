package com.murukmuruk.domain.admin.controller;

import com.murukmuruk.domain.admin.dto.MerchantStatusChangeRequest;
import com.murukmuruk.domain.admin.dto.MerchantStatusChangeResponse;
import com.murukmuruk.domain.admin.service.AdminMerchantService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관리자: 가맹점 관리. /api/admin/** 는 SecurityConfig에서 ROLE_ADMIN만 허용 (아니면 403) */
@Tag(name = "관리자 - 가맹점", description = "가맹점 신청을 승인하거나 정지·해제하고, 가맹점 목록을 봅니다. (관리자 전용)")
@RestController
@RequestMapping("/api/admin/merchants")
@RequiredArgsConstructor
public class AdminMerchantController {

    private final AdminMerchantService adminMerchantService;

    /** PATCH /api/admin/merchants/{merchantId}/status : 승인·정지·해제 */
    @Operation(summary = "가맹점 상태 변경 (승인·정지·해제)",
            description = "허용되는 변경은 승인(APPLIED→ACTIVE), 반려(APPLIED→REJECTED), 일시 정지(ACTIVE→SUSPENDED), 정지 해제(SUSPENDED→ACTIVE)입니다. "
                    + "APPLIED(심사 대기)로 바꾸는 요청은 400이고, 그 외 허용되지 않는 변경이나 같은 상태로의 변경은 409입니다. "
                    + "승인된 가맹점만 기획전에 참여할 수 있습니다.")
    @PatchMapping("/{merchantId}/status")
    public ApiResponse<MerchantStatusChangeResponse> changeStatus(
            @PathVariable Long merchantId,
            @Valid @RequestBody MerchantStatusChangeRequest request) {
        return ApiResponse.success(adminMerchantService.changeStatus(merchantId, request.status()));
    }
}