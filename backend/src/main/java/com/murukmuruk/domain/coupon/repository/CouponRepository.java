package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.coupon.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    /** 이미 받은 쿠폰인지 (같은 정책은 사용자당 1장) */
    boolean existsByUserIdAndCouponPolicyId(Long userId, Long couponPolicyId);

    /** 주어진 정책들 중 내가 이미 받은 정책 ID (목록의 alreadyClaimed 계산용). ids는 비어 있으면 안 된다. */
    @Query("select c.couponPolicyId from Coupon c where c.userId = :userId and c.couponPolicyId in :ids")
    List<Long> findClaimedPolicyIds(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);
}