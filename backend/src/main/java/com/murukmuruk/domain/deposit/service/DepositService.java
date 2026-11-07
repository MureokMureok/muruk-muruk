package com.murukmuruk.domain.deposit.service;

import com.murukmuruk.domain.coupon.repository.MerchantLimitRepository;
import com.murukmuruk.domain.deposit.dto.DevDepositResponse;
import com.murukmuruk.domain.deposit.entity.MerchantDeposit;
import com.murukmuruk.domain.deposit.repository.MerchantDepositRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class DepositService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final MerchantLimitRepository merchantLimitRepository;
    private final MerchantDepositRepository merchantDepositRepository;

    /**
     * 개발용 임시 입금.
     * 실제로는 체인에서 입금이 확정되면 서버가 감지해서 같은 처리를 한다.
     * 입금 내역 저장과 한도 증가는 한 트랜잭션이라 둘 다 성공하거나 둘 다 실패한다.
     */
    @Transactional
    public DevDepositResponse devDeposit(Long merchantId, long amount) {
        merchantLimitRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        MerchantDeposit deposit = merchantDepositRepository.save(
                MerchantDeposit.create(merchantId, amount, randomTxHash()));
        merchantLimitRepository.addIssueLimit(merchantId, amount);

        // 조건부 UPDATE 이후 최신 값을 다시 읽는다
        Merchant merchant = merchantLimitRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        return new DevDepositResponse(
                deposit.getId(), amount, deposit.getTxHash(),
                merchant.getIssueLimit(), merchant.getIssuedAmount(), merchant.getRemainingLimit());
    }

    /** 가짜 거래 해시: 0x + 64자리 16진수 (실제 체인 연동 전까지 사용) */
    private String randomTxHash() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return "0x" + HexFormat.of().formatHex(bytes);
    }
}