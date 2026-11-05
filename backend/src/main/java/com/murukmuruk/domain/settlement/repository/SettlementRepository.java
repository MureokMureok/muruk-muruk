package com.murukmuruk.domain.settlement.repository;

import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.enums.OrderStatus;
import com.murukmuruk.domain.settlement.dto.SettlementRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/** 정산 내역 조회 전용. 주문 + 사용된 쿠폰 + 쿠폰 정책 + 고객을 조인한다. */
public interface SettlementRepository extends Repository<Order, Long> {

    /** 우리 가게에서 쿠폰을 쓴 주문 목록 (주문 id 내림차순, 커서보다 작은 id만) */
    @Query("select new com.murukmuruk.domain.settlement.dto.SettlementRow("
            + "o.id, c.usedAt, p.name, p.receiveType, u.name, o.discountAmount) "
            + "from com.murukmuruk.domain.order.entity.Order o "
            + "join Coupon c on c.usedOrderId = o.id "
            + "join CouponPolicy p on p.id = c.couponPolicyId "
            + "join User u on u.id = o.userId "
            + "where o.merchantId = :merchantId and o.status = :status and o.id < :cursor "
            + "order by o.id desc")
    List<SettlementRow> findSettlements(@Param("merchantId") Long merchantId,
                                        @Param("status") OrderStatus status,
                                        @Param("cursor") long cursor,
                                        Pageable pageable);

    /** 기획전 쿠폰(CAMPAIGN)으로 쓴 할인액 합계 */
    @Query("select coalesce(sum(o.discountAmount), 0L) "
            + "from com.murukmuruk.domain.order.entity.Order o "
            + "join Coupon c on c.usedOrderId = o.id "
            + "join CouponPolicy p on p.id = c.couponPolicyId "
            + "where o.merchantId = :merchantId and o.status = :status and p.receiveType = :receiveType")
    Long sumDiscountByReceiveType(@Param("merchantId") Long merchantId,
                                  @Param("status") OrderStatus status,
                                  @Param("receiveType") ReceiveType receiveType);

    /** 기획전이 아닌 일반 쿠폰으로 쓴 할인액 합계 */
    @Query("select coalesce(sum(o.discountAmount), 0L) "
            + "from com.murukmuruk.domain.order.entity.Order o "
            + "join Coupon c on c.usedOrderId = o.id "
            + "join CouponPolicy p on p.id = c.couponPolicyId "
            + "where o.merchantId = :merchantId and o.status = :status and p.receiveType <> :receiveType")
    Long sumDiscountExcludingReceiveType(@Param("merchantId") Long merchantId,
                                         @Param("status") OrderStatus status,
                                         @Param("receiveType") ReceiveType receiveType);
}