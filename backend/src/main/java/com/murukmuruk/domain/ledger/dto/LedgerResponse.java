package com.murukmuruk.domain.ledger.dto;

import java.util.List;

/** KCP 기록 화면 (GET /api/admin/ledger): 오늘 숫자 + 기록 목록 */
public record LedgerResponse(Stats stats, List<LedgerRowResponse> rows) {

    public record Stats(
            long issuedToday,      // 오늘 발급된 쿠폰 수
            long usedToday,        // 오늘 사용 완료된 쿠폰 수
            long rejected,         // 컨트랙트가 차단한(거절된) 시도 수
            long merchants,        // 승인된 가맹점 수
            long activeCampaigns   // 진행 중인 기획전 수
    ) {
    }
}