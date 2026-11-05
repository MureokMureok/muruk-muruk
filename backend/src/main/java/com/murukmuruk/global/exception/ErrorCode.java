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
    COUPON_CONFLICT(HttpStatus.CONFLICT, "COUPON409", "이미 사용된 쿠폰입니다.");

    private final HttpStatus status; // 실제 HTTP 상태 코드
    private final String code;       // 응답에 넣는 코드
    private final String message;    // 기본 메시지
}