package com.murukmuruk.domain.campaign.entity;

import com.murukmuruk.domain.campaign.enums.TermValidity;
import com.murukmuruk.domain.common.entity.BaseTimeEntity;
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

import java.time.LocalDateTime;

/**
 * 기획전에 참여하는 가게 한 곳의 쿠폰 조건 (예치금 없음, 가게는 "할인 한도(cap)"만 정한다).
 * 준비 중(PREPARING)에는 다시 등록해서 바꿀 수 있고, 시작 승인 때 쿠폰 정책(coupon_policy)이 만들어져 연결된다.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "campaign_term")
public class CampaignTerm extends BaseTimeEntity {

    // 가게가 조건을 등록하기 전 기본값 (가게 화면에서 바꾼다)
    private static final long DEFAULT_DISCOUNT = 2000L;
    private static final long DEFAULT_MIN_ORDER = 15000L;
    private static final long DEFAULT_CAP = 100000L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false, updatable = false)
    private Long campaignId;

    @Column(name = "merchant_id", nullable = false, updatable = false)
    private Long merchantId;

    @Column(name = "coupon_policy_id")
    private Long couponPolicyId; // 시작 승인 때 채워진다

    @Column(name = "discount_amount", nullable = false)
    private long discountAmount;

    @Column(name = "min_order_amount", nullable = false)
    private long minOrderAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TermValidity validity;

    @Column(nullable = false)
    private long cap; // 할인 한도(상한)

    @Column(name = "registered_at")
    private LocalDateTime registeredAt; // null이면 아직 "기획전에 등록하기"를 누르지 않은 것

    /** 기획전을 만들 때 참여 가게마다 기본값으로 한 행씩 만든다 */
    public static CampaignTerm createDefault(Long campaignId, Long merchantId) {
        CampaignTerm term = new CampaignTerm();
        term.campaignId = campaignId;
        term.merchantId = merchantId;
        term.discountAmount = DEFAULT_DISCOUNT;
        term.minOrderAmount = DEFAULT_MIN_ORDER;
        term.validity = TermValidity.DAYS30;
        term.cap = DEFAULT_CAP;
        return term;
    }

    /**
     * 조건 저장. register가 true면 "기획전에 등록하기"(등록 시각 기록), false면 임시 저장.
     * 임시 저장은 등록 상태를 푼다. 이미 체인에 등록한 값과 달라진 채로 시작 승인이 되면 안 되므로,
     * 값을 바꾼 가게는 다시 등록해야 한다.
     */
    public void update(long discountAmount, long minOrderAmount, TermValidity validity, long cap, boolean register) {
        this.discountAmount = discountAmount;
        this.minOrderAmount = minOrderAmount;
        this.validity = validity;
        this.cap = cap;
        this.registeredAt = register ? LocalDateTime.now() : null;
    }

    public void attachPolicy(Long couponPolicyId) {
        this.couponPolicyId = couponPolicyId;
    }

    public boolean isRegistered() {
        return registeredAt != null;
    }

    /** 최대 발급 수 = 할인 한도 ÷ 할인 금액 (내림) */
    public long getMaxIssue() {
        return discountAmount > 0 ? cap / discountAmount : 0;
    }
}