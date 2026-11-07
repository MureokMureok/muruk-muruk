package com.murukmuruk.domain.merchant.entity;

import com.murukmuruk.domain.common.entity.BaseTimeEntity;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
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

/** 가맹점. 발행 한도(issueLimit)와 지금까지 발행한 금액(issuedAmount)도 여기서 관리한다. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA용 기본 생성자 (외부에서는 create()로만 생성)
@Entity
@Table(name = "merchant")
public class Merchant extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_sub", nullable = false, length = 255)
    private String googleSub; // 구글 고유 ID (가맹점 계정 구분 기준)

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MerchantCategory category;

    @Column(name = "business_no", nullable = false, columnDefinition = "CHAR(10)")
    private String businessNo; // 숫자 10자리, '-' 없이

    @Column(name = "wallet_address", nullable = false, columnDefinition = "CHAR(42)")
    private String walletAddress; // 소문자

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MerchantStatus status;

    @Column(name = "issue_limit", nullable = false)
    private long issueLimit; // 지금까지 등록된 발행 한도 합계

    @Column(name = "issued_amount", nullable = false)
    private long issuedAmount; // 발행한 쿠폰 금액 합계 (남은 한도 = issueLimit - issuedAmount)

    /** 가입 신청: 처음 상태는 항상 APPLIED, 한도는 0 */
    public static Merchant create(String googleSub, String name, MerchantCategory category,
                                  String businessNo, String walletAddress) {
        Merchant merchant = new Merchant();
        merchant.googleSub = googleSub;
        merchant.name = name;
        merchant.category = category;
        merchant.businessNo = businessNo;
        merchant.walletAddress = walletAddress.toLowerCase(); // 지갑 주소는 항상 소문자로 저장
        merchant.status = MerchantStatus.APPLIED;
        return merchant;
    }

    public boolean isActive() {
        return status == MerchantStatus.ACTIVE;
    }

    public boolean isSuspended() {
        return status == MerchantStatus.SUSPENDED;
    }

    /** 승인: APPLIED → ACTIVE */
    public void approve() {
        if (status != MerchantStatus.APPLIED) {
            throw new BusinessException(ErrorCode.CONFLICT); // 승인 대기 상태에서만 승인 가능
        }
        this.status = MerchantStatus.ACTIVE;
    }

    /** 반려: APPLIED → REJECTED */
    public void reject() {
        if (status != MerchantStatus.APPLIED) {
            throw new BusinessException(ErrorCode.CONFLICT, "신청 대기 중인 가맹점만 반려할 수 있습니다.");
        }
        this.status = MerchantStatus.REJECTED;
    }

    /** 정지: ACTIVE → SUSPENDED */
    public void suspend() {
        if (status != MerchantStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.CONFLICT); // 활성 상태에서만 정지 가능
        }
        this.status = MerchantStatus.SUSPENDED;
    }

    /** 정지 해제: SUSPENDED → ACTIVE */
    public void unsuspend() {
        if (status != MerchantStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.CONFLICT); // 정지 상태에서만 해제 가능
        }
        this.status = MerchantStatus.ACTIVE;
    }

    /** 남은 발행 한도 */
    public long getRemainingLimit() {
        return issueLimit - issuedAmount;
    }
}