package com.murukmuruk.global.util;

import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantCategory;

/**
 * 가게를 화면에 보여줄 때 쓰는 값 (짧은 이름, 표시 색, 업종 글자).
 * 백엔드에는 색 정보가 없어서 가게 번호로 정해진 색을 돌려가며 쓴다 (프론트의 새 가게 색 목록과 같은 순서).
 */
public final class MerchantLook {

    private static final String[] COLORS = {"#ffc091", "#ffd7ef", "#a0e1e1", "#ffe7a3", "#d5e8b5"};

    private MerchantLook() {
    }

    public static String shortName(Merchant merchant) {
        String name = merchant.getName();
        return name == null || name.isEmpty() ? "?" : name.substring(0, 1);
    }

    public static String color(Merchant merchant) {
        return COLORS[(int) (merchant.getId() % COLORS.length)];
    }

    /** 프론트 모의 데이터의 업종 글자와 같게 맞춘다 */
    public static String categoryLabel(MerchantCategory category) {
        return switch (category) {
            case FLOWER_PLANT -> "꽃·식물";
            case FRUIT -> "제철 과일";
            case SEAFOOD, SIDE_DISH -> "수산·반찬";
            case FARM_PRODUCE -> "농산물";
        };
    }

    /** 소비자 이름 가리기: "지민" → "지*" */
    public static String maskName(String name) {
        return (name == null || name.isEmpty() ? "?" : name.substring(0, 1)) + "*";
    }

    public static String won(long amount) {
        return String.format("%,d원", amount);
    }
}