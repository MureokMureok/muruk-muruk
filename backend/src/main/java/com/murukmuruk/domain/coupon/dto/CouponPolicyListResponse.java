package com.murukmuruk.domain.coupon.dto;

import java.util.List;

/** 커서 방식 목록 응답: 다음 요청에는 nextCursor 값을 cursor로 보낸다. */
public record CouponPolicyListResponse(
        List<CouponPolicyItem> items,
        Long nextCursor,  // 마지막 페이지면 null
        boolean hasNext
) {
}