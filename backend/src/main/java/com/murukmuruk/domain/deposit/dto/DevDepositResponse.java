package com.murukmuruk.domain.deposit.dto;

/** 개발용 임시 입금 결과 */
public record DevDepositResponse(
        long depositId,
        long amount,
        String txHash,
        long issueLimit,
        long issuedAmount,
        long remainingLimit
) {
}