package com.murukmuruk.domain.settlement.dto;

import java.util.List;

public record SettlementListResponse(
        SettlementSummary summary,
        List<SettlementItem> items,
        Long nextCursor, // 마지막 페이지면 null
        boolean hasNext
) {
}