package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponPolicyRepository extends JpaRepository<CouponPolicy, Long> {
    // 발급 수량 증가용 조건부 UPDATE 쿼리는 쿠폰 발행/받기 단계에서 여기에 추가한다
}