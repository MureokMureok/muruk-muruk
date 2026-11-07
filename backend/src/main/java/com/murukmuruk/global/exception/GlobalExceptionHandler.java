package com.murukmuruk.global.exception;

import com.murukmuruk.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice // 모든 컨트롤러에서 던진 예외를 여기서 한 번에 처리
public class GlobalExceptionHandler {

    // 우리가 직접 던진 예외 (BusinessException)
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusiness(BusinessException e) {
        ErrorCode errorCode = e.getErrorCode();
        if (errorCode.getStatus().is5xxServerError()) { // 서버 쪽 오류(500, CHAIN500)는 로그를 남긴다
            log.error("business error: {}", e.getMessage(), e);
        }
        return build(errorCode, e.getMessage(), e.getData());
    }

    // @Valid 검증 실패 (예: idToken이 비어 있음) → 400
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError != null && fieldError.getDefaultMessage() != null
                ? fieldError.getDefaultMessage()          // DTO에 적어 둔 검증 메시지
                : ErrorCode.BAD_REQUEST.getMessage();
        return build(ErrorCode.BAD_REQUEST, message);
    }

    // 잘못된 요청 형태는 모두 400
    // - JSON이 깨졌거나 enum 값이 틀린 본문
    // - 쿼리 파라미터 타입 오류(status=ABC, size=abc), 필수 파라미터 누락
    // - 지원하지 않는 메서드, 지원하지 않는 Content-Type
    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            HandlerMethodValidationException.class,
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception e) {
        return build(ErrorCode.BAD_REQUEST, ErrorCode.BAD_REQUEST.getMessage());
    }

    // 없는 경로로 요청 → 404
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NoResourceFoundException e) {
        return build(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.getMessage());
    }

    // 예상 못 한 모든 예외 → 500 (내부 내용은 숨기고 서버 로그에만 남김)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
        log.error("unexpected error", e);
        return build(ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR.getMessage());
    }

    // 공통 응답 조립: HTTP 상태 + 공통 응답 본문
    private ResponseEntity<ApiResponse<Void>> build(ErrorCode errorCode, String message) {
        return ResponseEntity.status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.getCode(), message));
    }

    // 부가 정보(result)가 있는 실패 응답
    private ResponseEntity<ApiResponse<Object>> build(ErrorCode errorCode, String message, Object data) {
        return ResponseEntity.status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.getCode(), message, data));
    }
}