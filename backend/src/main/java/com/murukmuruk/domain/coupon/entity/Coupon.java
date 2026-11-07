package com.murukmuruk.domain.coupon.entity;

import com.murukmuruk.domain.coupon.enums.CouponState;
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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** 사용자가 받은 쿠폰 1장 (체인 NFT 1개). updated_at 컬럼이 없어 BaseTimeEntity를 쓰지 않는다. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coupon")
@EntityListeners(AuditingEntityListener.class)
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "coupon_policy_id", nullable = false, updatable = false)
    private Long couponPolicyId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "token_id", nullable = false, updatable = false)
    private long tokenId; // 체인 NFT 번호

    // 사용 처리(상태, 사용 주문, 사용 시각)는 JPA 더티체킹이 아니라 조건부 UPDATE로만 한다 (재사용 방지).
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, updatable = false, length = 20)
    private CouponState state;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private LocalDateTime expiresAt;

    @Column(name = "issued_order_id", updatable = false)
    private Long issuedOrderId; // 기획전 쿠폰만

    @Column(name = "used_order_id", updatable = false)
    private Long usedOrderId;

    @Column(name = "used_at", updatable = false)
    private LocalDateTime usedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 새 쿠폰 발급: 처음 상태는 항상 ACTIVE */
    public static Coupon issue(Long couponPolicyId, Long userId, long tokenId, LocalDateTime expiresAt) {
        Coupon coupon = new Coupon();
        coupon.couponPolicyId = couponPolicyId;
        coupon.userId = userId;
        coupon.tokenId = tokenId;
        coupon.state = CouponState.ACTIVE;
        coupon.expiresAt = expiresAt;
        return coupon;
    }
}