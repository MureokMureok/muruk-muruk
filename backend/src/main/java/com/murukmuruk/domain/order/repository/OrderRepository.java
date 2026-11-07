package com.murukmuruk.domain.order.repository;

import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * 주문 상태를 from에서 to로 바꾼다. 지금 상태가 from일 때만 바뀐다 (반환값 0이면 이미 다른 요청이 처리함).
     * 같은 주문을 동시에 확정·취소해도 한 요청만 1을 돌려받는다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE orders SET status = :to, updated_at = CURRENT_TIMESTAMP(6) "
            + "WHERE id = :id AND status = :from", nativeQuery = true)
    int transition(@Param("id") Long id, @Param("from") String from, @Param("to") String to);

    /** 내 주문 중 해당 상태인 것 (MY 요약의 아낀 금액 계산용) */
    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);
}