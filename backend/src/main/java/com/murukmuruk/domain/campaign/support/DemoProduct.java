package com.murukmuruk.domain.campaign.support;

/**
 * 시연용 상품. 백엔드에는 상품 테이블이 없어서 가게마다 "대표 상품" 1개를 같은 가격으로 보여준다.
 * (프론트도 새로 가입한 가게에는 같은 방식의 기본 상품을 쓴다)
 */
public final class DemoProduct {

    /** 시연용 상품 가격(원). 기획전 쿠폰의 최소 주문 금액보다 크게 잡는다 */
    public static final long PRICE = 25000L;

    private DemoProduct() {
    }

    public static String nameOf(String merchantName) {
        return merchantName + " 대표 상품";
    }
}