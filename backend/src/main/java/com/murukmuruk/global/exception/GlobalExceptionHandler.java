package com.murukmuruk.global.exception;

import com.murukmuruk.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice // 모든 컨트롤러에서 발생한 예외를 여기서 처리
public class GlobalExceptionHandler {

    // 우리가 직접 던진 예외 (BusinessException)
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e) {
        ErrorCode errorCode = e.getErrorCode();
        if (errorCode == ErrorCode.INTERNAL_SERVER_ERROR) {
            log.error("business error: {}", e.getMessage(), e); // 서버 오류만 로그를 남김
        }
        return build(errorCode, e.getMessage());
    }

    // @Valid 검증 실패 (예: idToken이 비어 있음) → 400
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError != null && fieldError.getDefaultMessage() != null
                ? fieldError.getDefaultMessage()          // DTO에 적어 둔 메시지
                : ErrorCode.BAD_REQUEST.getMessage();
        return build(ErrorCode.BAD_REQUEST, message);
    }

    // JSON 형식이 깨졌거나, 지원하지 않는 메서드·타입으로 요청 → 400
    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception e) {
        return build(ErrorCode.BAD_REQUEST, ErrorCode.BAD_REQUEST.getMessage());
    }

    // 없는 주소로 요청 → 404
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NoResourceFoundException e) {
        return build(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.getMessage());
    }

    // 위에서 못 잡은 모든 예외 → 500 (상세 내용은 응답에 노출하지 않고 로그에만 남김)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
        log.error("unexpected error", e);
        return build(ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR.getMessage());
    }

    // 공통 응답 조립: HTTP 상태 + 명세 형식 본문
    private ResponseEntity<ApiResponse<Void>> build(ErrorCode errorCode, String message) {
        return ResponseEntity.status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.getCode(), message));
    }
}