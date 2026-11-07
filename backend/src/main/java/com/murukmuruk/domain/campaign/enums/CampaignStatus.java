package com.murukmuruk.domain.campaign.enums;

/** 연합 기획전 상태 */
public enum CampaignStatus {
    PREPARING, // 준비 중: 참여 가게들이 쿠폰 조건을 등록한다
    ACTIVE,    // 진행 중: 구매하면 쿠폰이 발급된다
    PAUSED,    // 일시 중지: 새 발급만 멈추고, 이미 받은 쿠폰은 유효기간까지 쓸 수 있다
    ENDED;     // 종료

    /** 지금 상태에서 next로 바꿀 수 있는지 (준비 중→진행 중, 진행 중→일시 중지·종료, 일시 중지→진행 중·종료) */
    public boolean canMoveTo(CampaignStatus next) {
        return switch (this) {
            case PREPARING -> next == ACTIVE;
            case ACTIVE -> next == PAUSED || next == ENDED;
            case PAUSED -> next == ACTIVE || next == ENDED;
            case ENDED -> false;
        };
    }
}