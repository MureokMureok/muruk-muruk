package com.murukmuruk.domain.order.entity;

import com.murukmuruk.domain.order.enums.OrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** 주문 (시연용 결제). 결제 금액은 totalAmount - discountAmount 로 계산한다. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "orders")
@EntityListeners(AuditingEntityListener.class)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "merchant_id", nullable = false, updatable = false)
    private Long merchantId;

    @Column(name = "item_name", nullable = false, updatable = false, length = 100)
    private String itemName;

    @Column(name = "total_amount", nullable = false, updatable = false)
    private long totalAmount;

    @Column(name = "discount_amount", nullable = false, updatable = false)
    private long discountAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrderStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** 새 주문: 처음 상태는 PENDING */
    public static Order create(Long userId, Long merchantId, String itemName,
                               long totalAmount, long discountAmount) {
        Order order = new Order();
        order.userId = userId;
        order.merchantId = merchantId;
        order.itemName = itemName;
        order.totalAmount = totalAmount;
        order.discountAmount = discountAmount;
        order.status = OrderStatus.PENDING;
        return order;
    }

    /** 기획전 주문: 모의 결제가 끝난 상태(PAID)로 만든다. 이후 구매 확정(CONFIRMED) 또는 취소(CANCELLED) */
    public static Order createPaid(Long userId, Long merchantId, String itemName,
                                   long totalAmount, long discountAmount) {
        Order order = create(userId, merchantId, itemName, totalAmount, discountAmount);
        order.status = OrderStatus.PAID;
        return order;
    }

    /** 체인 소각이 확정되면 결제 완료 */
    public void markPaid() {
        this.status = OrderStatus.PAID;
    }

    public long getPaidAmount() {
        return totalAmount - discountAmount;
    }
}