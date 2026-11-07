package com.murukmuruk.domain.coupon.repository;

import com.murukmuruk.domain.coupon.dto.CouponPolicyRow;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CouponPolicyRepository extends JpaRepository<CouponPolicy, Long> {

    /**
     * 발급 수량 +1. 남은 수량이 있을 때만 올라간다 (반환값 0이면 소진).
     * 동시에 여러 요청이 와도 quantity를 넘지 않는다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon_policy SET issued_count = issued_count + 1, updated_at = CURRENT_TIMESTAMP(6) "
            + "WHERE id = :id AND issued_count < quantity", nativeQuery = true)
    int increaseIssuedCount(@Param("id") Long id);

    /**
     * 발급 수량 -1. 기획전 구매가 취소돼 쿠폰이 무효가 되면 그 가게의 발급 수를 되돌려 다른 손님에게 다시 나갈 수 있게 한다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE coupon_policy SET issued_count = issued_count - 1, updated_at = CURRENT_TIMESTAMP(6) "
            + "WHERE id = :id AND issued_count > 0", nativeQuery = true)
    int decreaseIssuedCount(@Param("id") Long id);

    /** 우리 가게가 직접 발행한 일반 쿠폰 목록 (기획전 쿠폰은 뺀다). 최신순 */
    List<CouponPolicy> findByMerchantIdAndReceiveTypeNotOrderByIdDesc(Long merchantId, ReceiveType receiveType);

    /**
     * 지금 받을 수 있는 쿠폰: 받는 조건이 DIRECT, 가맹점이 ACTIVE, 수량이 남아 있는 것.
     * id 내림차순, 커서보다 작은 id만 조회한다.
     */
    @Query("select new com.murukmuruk.domain.coupon.dto.CouponPolicyRow("
            + "p.id, p.name, m.id, m.name, m.category, p.discountAmount, p.minOrderAmount, "
            + "p.validDays, p.quantity - p.issuedCount) "
            + "from CouponPolicy p join Merchant m on m.id = p.merchantId "
            + "where p.receiveType = :receiveType and m.status = :merchantStatus "
            + "and p.issuedCount < p.quantity and p.id < :cursor "
            + "order by p.id desc")
    List<CouponPolicyRow> findClaimable(@Param("receiveType") ReceiveType receiveType,
                                        @Param("merchantStatus") MerchantStatus merchantStatus,
                                        @Param("cursor") long cursor,
                                        Pageable pageable);
}