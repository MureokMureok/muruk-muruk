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

    // ───────────── 기획전 쿠폰 ─────────────

    /** 내 쿠폰 전체 (발급 최신순) */
    List<Coupon> findByUserIdOrderByIdDesc(Long userId);

    /** 이 주문으로 발급된 쿠폰 (구매 확정·취소 때 찾는다) */
    List<Coupon> findByIssuedOrderId(Long issuedOrderId);

    /** 여러 주문으로 발급된 쿠폰 (같은 구매로 받은 쿠폰 수 계산용) */
    List<Coupon> findByIssuedOrderIdIn(Collection<Long> issuedOrderIds);

    /** 이 주문(쿠폰을 적용한 결제)에 쓰인 쿠폰 */
    List<Coupon> findByUsedOrderId(Long usedOrderId);

    /** 정책들의 쿠폰 중 해당 상태인 것 (사용 수·할인 부담 계산용) */
    List<Coupon> findByCouponPolicyIdInAndState(Collection<Long> couponPolicyIds, CouponState state);

    /** 기획전 쿠폰 중 해당 상태인 것 (손님 흐름 계산용) */
    List<Coupon> findByCampaignIdInAndState(Collection<Long> campaignIds, CouponState state);

    /**
     * 결제에 쿠폰을 적용한다 (사용 락업): ACTIVE이고 만료 전일 때만 IN_USE로 바뀐다 (반환값 0이면 못 씀).
     * 같은 쿠폰을 동시에 두 결제에 적용해도 한 요청만 1을 돌려받는다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'IN_USE', used_order_id = :orderId "
            + "WHERE id = :id AND status = 'ACTIVE' AND expires_at > :now", nativeQuery = true)
    int lockForUse(@Param("id") Long id, @Param("orderId") Long orderId, @Param("now") LocalDateTime now);

    /** 결제 확정: 이 주문에 적용된 IN_USE 쿠폰을 USED로 (사용 완료) */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'USED', used_at = :now "
            + "WHERE used_order_id = :orderId AND status = 'IN_USE'", nativeQuery = true)
    int confirmUse(@Param("orderId") Long orderId, @Param("now") LocalDateTime now);

    /** 결제 취소: 이 주문에 적용된 IN_USE 쿠폰을 사용 가능(ACTIVE)으로 복원 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'ACTIVE', used_order_id = NULL "
            + "WHERE used_order_id = :orderId AND status = 'IN_USE'", nativeQuery = true)
    int restoreUse(@Param("orderId") Long orderId);

    /** 구매 확정: 이 주문으로 발급된 PENDING 쿠폰을 사용 가능(ACTIVE)으로 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'ACTIVE' "
            + "WHERE issued_order_id = :orderId AND status = 'PENDING'", nativeQuery = true)
    int activatePending(@Param("orderId") Long orderId);

    /** 구매 취소: 이 주문으로 발급된 PENDING 쿠폰을 무효(VOIDED)로 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'VOIDED' "
            + "WHERE issued_order_id = :orderId AND status = 'PENDING'", nativeQuery = true)
    int voidPending(@Param("orderId") Long orderId);

    // ───────────── 일반 쿠폰 ─────────────

    /** 이미 받은 쿠폰인지 (같은 정책은 사용자당 1장) */
    boolean existsByUserIdAndCouponPolicyId(Long userId, Long couponPolicyId);

    /** 주어진 정책들 중 내가 이미 받은 정책 ID (목록의 alreadyClaimed 계산용). ids는 비어 있으면 안 된다. */
    @Query("select c.couponPolicyId from Coupon c where c.userId = :userId and c.couponPolicyId in :ids")
    List<Long> findClaimedPolicyIds(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    /**
     * 같은 사용자의 동시 요청을 줄 세우기 위해 사용자 행을 잠근다 (SELECT ... FOR UPDATE).
     * 반드시 트랜잭션의 첫 쿼리여야 한다. 잠금을 얻은 뒤의 조회는 앞 요청이 커밋한 데이터를 본다.
     */
    @Query(value = "SELECT id FROM users WHERE id = :userId FOR UPDATE", nativeQuery = true)
    List<Long> lockUser(@Param("userId") Long userId);

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
     * 쿠폰을 사용 처리한다. 아직 ACTIVE이고 만료 전일 때만 바뀐다 (반환값 0이면 이미 사용됐거나 만료됨).
     * 동시에 두 번 눌러도 한 요청만 1을 돌려받으므로 재사용이 불가능하다.
     * 만료 비교에는 DB 시계(NOW) 대신 앱이 넘긴 시각을 쓴다 (DB 서버 타임존이 앱과 다를 수 있어서).
     * status, used_order_id, used_at 은 DB 제약상 함께 바뀌어야 해서 한 문장으로 처리한다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon SET status = 'USED', used_order_id = :orderId, used_at = :now "
            + "WHERE id = :id AND status = 'ACTIVE' AND expires_at > :now", nativeQuery = true)
    int markUsed(@Param("id") Long id,
                 @Param("orderId") Long orderId,
                 @Param("now") LocalDateTime now);
}