package com.murukmuruk.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter                  // getStatus(), getCode(), getMessage() 자동 생성
@RequiredArgsConstructor // 아래 final 필드 3개를 받는 생성자 자동 생성
public enum ErrorCode {

    BAD_REQUEST(HttpStatus.BAD_REQUEST, "COMMON400", "잘못된 요청입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "COMMON401", "로그인이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "COMMON403", "접근 권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON404", "요청한 대상을 찾을 수 없습니다."),
    CONFLICT(HttpStatus.CONFLICT, "COMMON409", "이미 존재하는 요청입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON500", "서버 오류가 발생했습니다."),
    CHAIN_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "CHAIN500", "체인 처리에 실패했습니다."),
    LIMIT_EXCEEDED(HttpStatus.CONFLICT, "LIMIT409", "남은 발행 한도를 초과했습니다."),
    COUPON_BAD_REQUEST(HttpStatus.BAD_REQUEST, "COUPON400", "쿠폰 사용 조건을 만족하지 않습니다."),
    COUPON_CONFLICT(HttpStatus.CONFLICT, "COUPON409", "이미 사용된 쿠폰입니다."),

    // ---- 기획전 / 주문 / 쿠폰 사용 락업 (코드 이름은 프론트 mock의 ApiError code와 같게 맞춤) ----
    INVALID(HttpStatus.BAD_REQUEST, "INVALID", "입력값을 확인해 주세요."),
    TERMS_LOCKED(HttpStatus.CONFLICT, "LOCKED", "기획전이 시작된 뒤에는 조건을 바꿀 수 없어요."),
    INVALID_STATUS(HttpStatus.CONFLICT, "INVALID_STATUS", "지금 상태에서는 할 수 없어요."),
    NOT_READY(HttpStatus.CONFLICT, "NOT_READY", "참여 가게의 쿠폰 조건이 모두 등록돼야 시작할 수 있어요."),
    ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "주문을 찾을 수 없어요."),
    ORDER_NOT_PAID(HttpStatus.CONFLICT, "ORDER_NOT_PAID", "이미 처리가 끝난 주문이에요."),
    ORDER_CONFIRMED(HttpStatus.CONFLICT, "ORDER_CONFIRMED", "구매 확정 후에는 단순 변심으로 환불할 수 없어요."),
    NOT_OWNER(HttpStatus.FORBIDDEN, "NOT_OWNER", "내 쿠폰이 아니라 쓸 수 없어요."),
    WRONG_MERCHANT(HttpStatus.BAD_REQUEST, "WRONG_MERCHANT", "이 가게에서는 쓸 수 없는 쿠폰이에요."),
    COUPON_EXPIRED(HttpStatus.BAD_REQUEST, "EXPIRED", "유효기간이 지난 쿠폰이에요."),
    MIN_ORDER_NOT_MET(HttpStatus.BAD_REQUEST, "MIN_ORDER_NOT_MET", "최소 주문 금액보다 적어 쓸 수 없어요."),
    COUPON_ALREADY_USED(HttpStatus.CONFLICT, "COUPON_ALREADY_USED", "이미 사용한 쿠폰이라 쓸 수 없어요."),
    COUPON_LOCKED(HttpStatus.CONFLICT, "COUPON_LOCKED", "구매 확정 후에 쓸 수 있는 쿠폰이에요."),
    COUPON_VOIDED(HttpStatus.CONFLICT, "COUPON_VOIDED", "주문이 취소돼 사라진 쿠폰이에요.");

    private final HttpStatus status; // 실제 HTTP 상태 코드
    private final String code;       // 응답에 넣는 코드
    private final String message;    // 기본 메시지
}