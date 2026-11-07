package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.merchant.entity.Merchant;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * 가맹점 발행 한도 전용 저장소.
 * 한도 숫자는 JPA 더티체킹이 아니라 조건부 UPDATE로만 바꾼다 (동시 요청에도 한도를 넘지 않게).
 * MerchantRepository는 가맹점 담당 영역이라 건드리지 않고 별도 인터페이스로 둔다.
 */
public interface MerchantLimitRepository extends Repository<Merchant, Long> {

    Optional<Merchant> findById(Long id);

    /** 입금 반영: 발행 한도(예치금 합계) 증가 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Merchant m set m.issueLimit = m.issueLimit + :amount where m.id = :id")
    int addIssueLimit(@Param("id") Long id, @Param("amount") long amount);

    /** 쿠폰 발행: 남은 한도가 충분할 때만 발행 금액 증가. 반환값 0이면 한도 초과. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Merchant m set m.issuedAmount = m.issuedAmount + :amount "
            + "where m.id = :id and m.issuedAmount + :amount <= m.issueLimit")
    int increaseIssuedAmount(@Param("id") Long id, @Param("amount") long amount);
}