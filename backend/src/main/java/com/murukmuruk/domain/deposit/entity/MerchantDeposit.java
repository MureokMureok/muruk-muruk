package com.murukmuruk.domain.deposit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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

/** 가맹점 입금 내역. 한 번 기록하면 수정하지 않으므로 updated_at이 없다 (BaseTimeEntity 사용 안 함). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "merchant_deposit")
@EntityListeners(AuditingEntityListener.class)
public class MerchantDeposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "merchant_id", nullable = false, updatable = false)
    private Long merchantId;

    @Column(nullable = false, updatable = false)
    private long amount; // 원 단위

    @Column(name = "tx_hash", nullable = false, updatable = false, columnDefinition = "CHAR(66)")
    private String txHash; // 체인 거래 해시 (중복 불가)

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static MerchantDeposit create(Long merchantId, long amount, String txHash) {
        MerchantDeposit deposit = new MerchantDeposit();
        deposit.merchantId = merchantId;
        deposit.amount = amount;
        deposit.txHash = txHash;
        return deposit;
    }
}