package com.murukmuruk.domain.ledger.controller;

import com.murukmuruk.domain.ledger.dto.LedgerResponse;
import com.murukmuruk.domain.ledger.service.LedgerQueryService;
import com.murukmuruk.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** KCP 관리자: 기록 화면. /api/admin/** 는 ROLE_ADMIN만 (SecurityConfig) */
@Tag(name = "관리자 - 기록", description = "발급·확정·사용·환불·거절 기록과 오늘 숫자를 보는 관리자 화면입니다. (관리자 전용)")
@RestController
@RequestMapping("/api/admin/ledger")
@RequiredArgsConstructor
public class AdminLedgerController {

    private final LedgerQueryService ledgerQueryService;

    @Operation(summary = "기록과 오늘 숫자",
            description = "오늘 발급·사용 수, 거절 수, 가맹점 수, 진행 중 기획전 수(stats)와 최신 기록(rows)을 돌려줍니다. "
                    + "기록은 한 번 쌓이면 고치지 않으며, 체인에 남는 거래는 tx 해시가 붙습니다.")
    @GetMapping
    public ApiResponse<LedgerResponse> ledger() {
        return ApiResponse.success(ledgerQueryService.getLedger());
    }
}