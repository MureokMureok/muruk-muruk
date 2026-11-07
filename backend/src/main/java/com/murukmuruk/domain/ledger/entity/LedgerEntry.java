package com.murukmuruk.domain.ledger.entity;

import com.murukmuruk.domain.ledger.enums.LedgerType;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** 기록 한 줄. 쌓기만 하고 고치지 않는다 (updated_at 없음). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "ledger")
@EntityListeners(AuditingEntityListener.class)
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private LedgerType type;

    @Column(nullable = false, updatable = false)
    private String detail;

    @Column(nullable = false, updatable = false, length = 100)
    private String actor;

    @Column(name = "merchant_id", updatable = false)
    private Long merchantId;

    @Column(name = "user_id", updatable = false)
    private Long userId;

    @Column(name = "campaign_id", updatable = false)
    private Long campaignId;

    @Column(name = "coupon_id", updatable = false)
    private Long couponId;

    @Column(name = "order_id", updatable = false)
    private Long orderId;

    @Column(name = "discount_amount", updatable = false)
    private Long discountAmount;

    @Column(name = "order_amount", updatable = false)
    private Long orderAmount;

    @Column(name = "tx_hash", updatable = false, columnDefinition = "CHAR(66)")
    private String txHash;

    @Column(name = "reason_code", updatable = false, length = 40)
    private String reasonCode; // REJECT 기록: 거절된 에러 코드

    @Column(name = "coupon_status", updatable = false, length = 20)
    private String couponStatus; // REJECT 기록: 그때의 쿠폰 화면 상태

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private LedgerEntry(LedgerType type, String detail, String actor, Long merchantId, Long userId,
                        Long campaignId, Long couponId, Long orderId, Long discountAmount,
                        Long orderAmount, String txHash, String reasonCode, String couponStatus) {
        this.type = type;
        this.detail = detail;
        this.actor = actor;
        this.merchantId = merchantId;
        this.userId = userId;
        this.campaignId = campaignId;
        this.couponId = couponId;
        this.orderId = orderId;
        this.discountAmount = discountAmount;
        this.orderAmount = orderAmount;
        this.txHash = txHash;
        this.reasonCode = reasonCode;
        this.couponStatus = couponStatus;
    }
}