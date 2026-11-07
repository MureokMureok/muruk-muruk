package com.murukmuruk.domain.deposit.repository;

import com.murukmuruk.domain.deposit.entity.MerchantDeposit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MerchantDepositRepository extends JpaRepository<MerchantDeposit, Long> {
    boolean existsByTxHash(String txHash); // 같은 입금 중복 반영 방지
}