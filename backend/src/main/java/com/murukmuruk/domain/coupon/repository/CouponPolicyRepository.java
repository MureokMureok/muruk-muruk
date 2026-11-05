package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CouponPolicyRepository extends JpaRepository<CouponPolicy, Long> {

    /**
     * 발급 수량 +1. 남은 수량이 있을 때만 올라간다 (반환값 0이면 소진).
     * 동시에 여러 요청이 와도 quantity를 넘지 않는다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon_policy SET issued_count = issued_count + 1, updated_at = CURRENT_TIMESTAMP(6) "
            + "WHERE id = :id AND issued_count < quantity", nativeQuery = true)
    int increaseIssuedCount(@Param("id") Long id);
}