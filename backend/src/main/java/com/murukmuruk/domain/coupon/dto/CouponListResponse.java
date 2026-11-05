package com.murukmuruk.domain.coupon.dto;

import java.util.List;

public record CouponListResponse(
        List<CouponItem> items,
        Long nextCursor, // 마지막 페이지면 null
        boolean hasNext
) {
}