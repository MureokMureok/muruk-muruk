package com.murukmuruk.global.security;

import com.murukmuruk.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/** 스프링 시큐리티 단계의 오류를 공통 응답 형식의 JSON으로 써 준다 */
public final class ErrorResponseWriter {

    private ErrorResponseWriter() {
    }

    public static void write(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getStatus().value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"isSuccess\":false,\"code\":\"" + errorCode.getCode()
                        + "\",\"message\":\"" + errorCode.getMessage()
                        + "\",\"result\":null}");
    }
}