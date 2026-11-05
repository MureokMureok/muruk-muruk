package com.murukmuruk.domain.coupon.dto;

import com.murukmuruk.domain.merchant.enums.MerchantCategory;

/** 목록 조회 쿼리 결과 한 줄. '이미 받았는지'는 쿼리에 없어서 서비스에서 붙인다. */
public record CouponPolicyRow(
        Long couponPolicyId,
        String name,
        Long merchantId,
        String merchantName,
        MerchantCategory category,
        Long discountAmount,
        Long minOrderAmount,
        Integer validDays,
        Integer remainingCount
) {
}