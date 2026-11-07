package com.murukmuruk.domain.order.support;

/**
 * 체인에 넘기는 주문·결제 식별 글자.
 * 컨트랙트는 이 글자를 keccak256으로 바꿔 orderRef/payRef로 쓴다 (진짜 체인 클라이언트에서 해시).
 * 한 구매가 기획전 여러 개에서 쿠폰을 받을 수 있어서, 구매 식별자는 주문+기획전 단위다.
 */
public final class ChainRefs {

    private ChainRefs() {
    }

    /** 구매(쿠폰 발급) 식별자: 주문 번호 + 기획전 번호 */
    public static String orderRef(long orderId, long campaignId) {
        return "order-" + orderId + "-c" + campaignId;
    }

    /** 결제(쿠폰 사용) 식별자: 쿠폰을 적용한 주문 번호 */
    public static String payRef(long orderId) {
        return "pay-" + orderId;
    }
}