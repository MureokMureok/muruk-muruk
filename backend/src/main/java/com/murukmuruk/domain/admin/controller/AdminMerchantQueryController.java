package com.murukmuruk.domain.admin.controller;

import com.murukmuruk.domain.admin.dto.AdminMerchantItem;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 관리자: 가맹점 목록 조회 (심사 화면, 기획전 만들기에서 가게 고르기).
 * 승인·정지는 기존 AdminMerchantController(PATCH /{merchantId}/status)가 한다.
 */
@Tag(name = "관리자 - 가맹점", description = "가맹점 신청을 승인하거나 정지·해제하고, 가맹점 목록을 봅니다. (관리자 전용)")
@RestController
@RequestMapping("/api/admin/merchants")
@RequiredArgsConstructor
public class AdminMerchantQueryController {

    private final MerchantRepository merchantRepository;

    @Operation(summary = "가맹점 목록",
            description = "status로 걸러 볼 수 있습니다(APPLIED 심사 대기 / ACTIVE 승인 / SUSPENDED 정지). 생략하면 전체, 최신 신청이 위입니다.")
    @GetMapping
    @Transactional(readOnly = true)
    public ApiResponse<List<AdminMerchantItem>> list(
            @Parameter(description = "가맹점 상태 (생략하면 전체)") @RequestParam(required = false) MerchantStatus status) {
        var merchants = status == null
                ? merchantRepository.findAllByOrderByIdDesc()
                : merchantRepository.findByStatusOrderByIdDesc(status);
        return ApiResponse.success(merchants.stream().map(AdminMerchantItem::from).toList());
    }
}