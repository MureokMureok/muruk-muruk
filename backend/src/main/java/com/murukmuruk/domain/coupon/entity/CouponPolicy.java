package com.murukmuruk.domain.coupon.entity;

import com.murukmuruk.domain.common.entity.BaseTimeEntity;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.enums.UsableScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 쿠폰 정책: 가맹점이 만든 쿠폰 규칙. 사용자가 받은 쿠폰 1장은 coupon 테이블에 따로 저장된다. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coupon_policy")
public class CouponPolicy extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 가맹점 엔티티와 직접 연결하지 않고 ID만 가진다 (패키지 간 결합 최소화)
    @Column(name = "merchant_id", nullable = false, updatable = false)
    private Long merchantId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "discount_amount", nullable = false, updatable = false)
    private long discountAmount; // 1장당 할인 금액(원)

    @Enumerated(EnumType.STRING)
    @Column(name = "receive_type", nullable = false, length = 20)
    private ReceiveType receiveType;

    @Column(name = "receive_amount")
    private Long receiveAmount; // MIN_AMOUNT일 때만 값 있음

    @Column(name = "min_order_amount", nullable = false)
    private long minOrderAmount; // 쿠폰 사용 최소 주문 금액

    @Column(name = "valid_days")
    private Integer validDays; // 발급 후 유효 일수

    @Enumerated(EnumType.STRING)
    @Column(name = "usable_scope", nullable = false, length = 20)
    private UsableScope usableScope;

    @Column(nullable = false, updatable = false)
    private int quantity; // 발행 수량

    // 발급 수량은 JPA로 수정하지 않는다 (updatable = false).
    // 반드시 조건부 UPDATE 쿼리로만 올려서 동시 요청에도 수량을 넘지 않게 한다.
    @Column(name = "issued_count", nullable = false, updatable = false)
    private int issuedCount;

    /** 새 쿠폰 정책 생성 (발급 수량은 0에서 시작) */
    public static CouponPolicy create(Long merchantId, String name, long discountAmount,
                                      ReceiveType receiveType, Long receiveAmount,
                                      long minOrderAmount, Integer validDays,
                                      UsableScope usableScope, int quantity) {
        CouponPolicy policy = new CouponPolicy();
        policy.merchantId = merchantId;
        policy.name = name;
        policy.discountAmount = discountAmount;
        policy.receiveType = receiveType;
        policy.receiveAmount = receiveAmount;
        policy.minOrderAmount = minOrderAmount;
        policy.validDays = validDays;
        policy.usableScope = usableScope;
        policy.quantity = quantity;
        policy.issuedCount = 0;
        return policy;
    }

    /** 남은 발급 가능 수량 */
    public int getRemainingCount() {
        return quantity - issuedCount;
    }
}