package com.murukmuruk.domain.ledger.service;

import com.murukmuruk.domain.ledger.entity.LedgerEntry;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** 기록 쌓기. 다른 서비스의 트랜잭션 안에서 부르면 같이 커밋/롤백된다. */
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerRepository ledgerRepository;

    /** 일반 기록: 호출한 쪽 트랜잭션에 포함된다 (그쪽이 롤백되면 기록도 사라진다) */
    @Transactional
    public void record(LedgerType type, String detail, String actor, Long merchantId, Long userId,
                       Long campaignId, Long couponId, Long orderId,
                       Long discountAmount, Long orderAmount, String txHash) {
        ledgerRepository.save(LedgerEntry.builder()
                .type(type).detail(detail).actor(actor)
                .merchantId(merchantId).userId(userId).campaignId(campaignId)
                .couponId(couponId).orderId(orderId)
                .discountAmount(discountAmount).orderAmount(orderAmount).txHash(txHash)
                .build());
    }

    /**
     * 거절 기록: 새 트랜잭션으로 바로 커밋한다.
     * 쿠폰 사용이 거절되면 호출한 쪽은 예외로 롤백되는데, 거절 기록은 남아야 하기 때문이다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordReject(String detail, String actor, Long merchantId, Long userId, Long couponId) {
        ledgerRepository.save(LedgerEntry.builder()
                .type(LedgerType.REJECT).detail(detail).actor(actor)
                .merchantId(merchantId).userId(userId).couponId(couponId)
                .build());
    }
}