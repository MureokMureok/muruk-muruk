package com.murukmuruk.domain.campaign.enums;

/** 기획전 쿠폰 유효기간 방식 */
public enum TermValidity {
    DAYS30, // 받은 날부터 30일 (30일째 되는 날 23:59:59까지)
    END     // 기획전 종료일까지 (종료일 23:59:59까지)
}