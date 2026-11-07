package com.murukmuruk.domain.campaign.entity;

import com.murukmuruk.domain.campaign.enums.CampaignStatus;
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

import java.time.LocalDate;

/** 연합 기획전. 이름·기간·상태만 가지고, 가게별 쿠폰 조건은 CampaignTerm에 있다. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "campaign")
public class Campaign extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "starts_on", nullable = false)
    private LocalDate startsOn; // 기록·표시용. 실제 시작은 KCP 시작 승인(ACTIVE)으로 정해진다

    @Column(name = "ends_on", nullable = false)
    private LocalDate endsOn; // 마지막으로 발급할 수 있는 날 (이 날 23:59:59까지)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CampaignStatus status;

    /** 새 기획전: 처음 상태는 항상 PREPARING */
    public static Campaign create(String title, LocalDate startsOn, LocalDate endsOn) {
        Campaign campaign = new Campaign();
        campaign.title = title;
        campaign.startsOn = startsOn;
        campaign.endsOn = endsOn;
        campaign.status = CampaignStatus.PREPARING;
        return campaign;
    }

    public void changeStatus(CampaignStatus next) {
        this.status = next;
    }

    /** 종료일이 지났는지 (종료일 당일까지는 발급 가능) */
    public boolean isPastEnd(LocalDate today) {
        return endsOn.isBefore(today);
    }

    /** 화면에 보여줄 상태: 종료일이 지난 진행 중·일시 중지 기획전은 종료로 본다 */
    public CampaignStatus effectiveStatus(LocalDate today) {
        if (status != CampaignStatus.PREPARING && isPastEnd(today)) {
            return CampaignStatus.ENDED;
        }
        return status;
    }
}