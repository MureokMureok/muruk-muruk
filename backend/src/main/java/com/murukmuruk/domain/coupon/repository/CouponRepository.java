package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.coupon.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    /** 이미 받은 쿠폰인지 (같은 정책은 사용자당 1장) */
    boolean existsByUserIdAndCouponPolicyId(Long userId, Long couponPolicyId);
}