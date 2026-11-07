package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.MerchantPolicyItem;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.coupon.entity.Coupon;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 가맹점: 우리 가게가 발행한 일반 쿠폰 목록 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MerchantPolicyQueryService {

    private final CouponPolicyRepository couponPolicyRepository;
    private final CouponRepository couponRepository;

    /** GET /api/merchants/me/coupon-policies : 최신 발행이 위. 기획전 쿠폰은 포함하지 않는다 */
    public List<MerchantPolicyItem> list(Long merchantId) {
        List<CouponPolicy> policies = couponPolicyRepository
                .findByMerchantIdAndReceiveTypeNotOrderByIdDesc(merchantId, ReceiveType.CAMPAIGN);
        if (policies.isEmpty()) {
            return List.of();
        }
        // 정책마다 사용 완료한 쿠폰 수
        Map<Long, Long> usedByPolicy = couponRepository
                .findByCouponPolicyIdInAndState(policies.stream().map(CouponPolicy::getId).toList(), CouponState.USED)
                .stream().collect(Collectors.groupingBy(Coupon::getCouponPolicyId, Collectors.counting()));
        return policies.stream()
                .map(p -> MerchantPolicyItem.of(p, usedByPolicy.getOrDefault(p.getId(), 0L)))
                .toList();
    }
}