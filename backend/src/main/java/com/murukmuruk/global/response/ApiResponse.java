package com.murukmuruk.global.response;

import com.fasterxml.jackson.annotation.JsonProperty;

// record: 값만 담는 불변 객체. getter, 생성자를 자동으로 만들어 줘요.
public record ApiResponse<T>(
        // JSON 키 이름이 "isSuccess"로 나오도록 고정 (안 쓰면 "success"로 바뀔 수 있어요)
        @JsonProperty("isSuccess") boolean isSuccess,
        String code,      // 예: COMMON200
        String message,   // 예: 요청에 성공했습니다.
        T result          // 실제 응답 데이터 (실패하면 null)
) {

    // 성공 응답 (200)
    public static <T> ApiResponse<T> success(T result) {
        return new ApiResponse<>(true, "COMMON200", "요청에 성공했습니다.", result);
    }

    // 생성 성공 응답 (201)
    public static <T> ApiResponse<T> created(T result) {
        return new ApiResponse<>(true, "COMMON201", "생성에 성공했습니다.", result);
    }

    // 실패 응답
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, code, message, null);
    }

    // 부가 정보가 있는 실패 응답 (result에 담긴다)
    public static <T> ApiResponse<T> error(String code, String message, T result) {
        return new ApiResponse<>(false, code, message, result);
    }
}