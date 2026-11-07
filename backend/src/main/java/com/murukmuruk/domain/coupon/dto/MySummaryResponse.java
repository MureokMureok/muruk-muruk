package com.murukmuruk.domain.coupon.dto;

/** GET /api/me/summary : MY 화면 요약 */
public record MySummaryResponse(
        long received,  // 받은 쿠폰 수 (구매 취소로 사라진 것은 뺀다)
        long used,      // 사용 완료한 쿠폰 수
        long saved      // 아낀 금액 (구매 확정된 주문의 할인 합계만)
) {
}