package com.murukmuruk.global.chain;

import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;

import java.util.function.Supplier;

/** 체인 호출 공통 처리: 어떤 예외든 실패는 CHAIN500(BusinessException)으로 맞춘다. */
public final class ChainCall {

    private ChainCall() {
    }

    public static <T> T run(Supplier<T> call) {
        try {
            return call.get();
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.CHAIN_ERROR, ErrorCode.CHAIN_ERROR.getMessage(), e);
        }
    }
}