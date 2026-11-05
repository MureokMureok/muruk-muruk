package com.murukmuruk.domain.admin.controller;

import com.murukmuruk.domain.admin.dto.MerchantStatusChangeRequest;
import com.murukmuruk.domain.admin.dto.MerchantStatusChangeResponse;
import com.murukmuruk.domain.admin.service.AdminMerchantService;
import com.murukmuruk.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관리자: 가맹점 관리. /api/admin/** 는 SecurityConfig에서 ROLE_ADMIN만 허용 (아니면 403) */
@RestController
@RequestMapping("/api/admin/merchants")
@RequiredArgsConstructor
public class AdminMerchantController {

    private final AdminMerchantService adminMerchantService;

    /** PATCH /api/admin/merchants/{merchantId}/status : 승인·정지·해제 */
    @PatchMapping("/{merchantId}/status")
    public ApiResponse<MerchantStatusChangeResponse> changeStatus(
            @PathVariable Long merchantId,
            @Valid @RequestBody MerchantStatusChangeRequest request) {
        return ApiResponse.success(adminMerchantService.changeStatus(merchantId, request.status()));
    }
}