package com.murukmuruk.global.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    // 에러 응답의 result에 실어 보낼 부가 정보 (없으면 null). 예: 쿠폰 사용 거절 때 5가지 확인 결과
    private Object data;

    // 기본 메시지를 그대로 쓸 때
    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    // 상황에 맞는 메시지로 바꿀 때 (예: "일시 정지된 계정입니다.")
    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    // 부가 정보를 실어 보낼 때: throw new BusinessException(code).withData(map)
    public BusinessException withData(Object data) {
        this.data = data;
        return this;
    }

    // 원인 예외를 같이 남길 때 (로그에서 원인을 추적하려고)
    public BusinessException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
}