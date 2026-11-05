package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.coupon.dto.CouponRow;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.enums.CouponState;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    /** 이미 받은 쿠폰인지 (같은 정책은 사용자당 1장) */
    boolean existsByUserIdAndCouponPolicyId(Long userId, Long couponPolicyId);

    /** 주어진 정책들 중 내가 이미 받은 정책 ID (목록의 alreadyClaimed 계산용). ids는 비어 있으면 안 된다. */
    @Query("select c.couponPolicyId from Coupon c where c.userId = :userId and c.couponPolicyId in :ids")
    List<Long> findClaimedPolicyIds(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    /**
     * 내 쿠폰함. 발급 최신순(id 내림차순), 커서보다 작은 id만 조회한다.
     * 상태 필터는 (DB 상태 목록) + (만료 시각 범위 lower < expiresAt <= upper)로 표현한다.
     *  - ISSUED : ACTIVE, 범위 (now, MAX]
     *  - EXPIRED: ACTIVE, 범위 (MIN, now]
     *  - USED   : USED,   범위 전체
     */
    @Query("select new com.murukmuruk.domain.coupon.dto.CouponRow("
            + "c.id, p.name, m.id, m.name, m.category, p.discountAmount, p.minOrderAmount, c.expiresAt, c.state) "
            + "from Coupon c "
            + "join CouponPolicy p on p.id = c.couponPolicyId "
            + "join Merchant m on m.id = p.merchantId "
            + "where c.userId = :userId and c.state in :states "
            + "and c.expiresAt > :lower and c.expiresAt <= :upper "
            + "and c.id < :cursor "
            + "order by c.id desc")
    List<CouponRow> findMine(@Param("userId") Long userId,
                             @Param("states") Collection<CouponState> states,
                             @Param("lower") LocalDateTime lower,
                             @Param("upper") LocalDateTime upper,
                             @Param("cursor") long cursor,
                             Pageable pageable);

    /**
     * 쿠폰을 사용 처리한다. 아직 ACTIVE일 때만 바뀐다 (반환값 0이면 이미 사용된 쿠폰).
     * 동시에 두 번 눌러도 한 요청만 1을 돌려받으므로 재사용이 불가능하다.
     * status, used_order_id, used_at 은 DB 제약상 함께 바뀌어야 해서 한 문장으로 처리한다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'USED', used_order_id = :orderId, used_at = :usedAt "
            + "WHERE id = :id AND status = 'ACTIVE'", nativeQuery = true)
    int markUsed(@Param("id") Long id,
                 @Param("orderId") Long orderId,
                 @Param("usedAt") LocalDateTime usedAt);
}