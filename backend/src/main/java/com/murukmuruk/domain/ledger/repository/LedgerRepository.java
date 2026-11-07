package com.murukmuruk.domain.ledger.repository;

import com.murukmuruk.domain.ledger.entity.LedgerEntry;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface LedgerRepository extends JpaRepository<LedgerEntry, Long> {

    /** 최신 기록부터 (K3 기록 화면) */
    List<LedgerEntry> findAllByOrderByIdDesc(Pageable pageable);

    /** 쿠폰 한 장의 발급·사용 기록 (최신순) */
    List<LedgerEntry> findByCouponIdOrderByIdDesc(Long couponId);

    /** 여러 쿠폰의 기록 중 거래 해시가 있는 것 (최신순). 쿠폰마다 "마지막 거래 해시"를 찾는 데 쓴다 */
    List<LedgerEntry> findByCouponIdInAndTxHashIsNotNullOrderByIdDesc(Collection<Long> couponIds);

    /** 기획전의 관리 기록 (가게 화면의 "조건 변경 이력") */
    List<LedgerEntry> findByCampaignIdAndTypeOrderByIdDesc(Long campaignId, LedgerType type);

    long countByType(LedgerType type);

    /** 기간 안에 쌓인 해당 종류 기록 수 (오늘 숫자) */
    long countByTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(LedgerType type, LocalDateTime from, LocalDateTime to);
}