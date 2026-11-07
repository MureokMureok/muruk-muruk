package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponHistoryItem;
import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.dto.MySummaryResponse;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.ledger.entity.LedgerEntry;
import com.murukmuruk.domain.ledger.repository.LedgerRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.enums.OrderStatus;
import com.murukmuruk.domain.order.repository.OrderRepository;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 소비자: 내 쿠폰 (기획전 화면용 모양) 조회 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyCouponService {

    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final LedgerRepository ledgerRepository;
    private final MerchantRepository merchantRepository;
    private final CouponViewAssembler couponViewAssembler;

    /** GET /api/me/coupons : 내 쿠폰 전체 (최신 발급이 위) */
    public List<CouponViewItem> list(Long userId) {
        return couponViewAssembler.assemble(couponRepository.findByUserIdOrderByIdDesc(userId));
    }

    /** GET /api/me/coupons/{couponId} : 쿠폰 한 장 (내 쿠폰만) */
    public CouponViewItem detail(Long userId, Long couponId) {
        return couponViewAssembler.assemble(List.of(ownCoupon(userId, couponId))).get(0);
    }

    /**
     * GET /api/me/coupons/{couponId}/history : 이 쿠폰의 발급·사용 기록 (오래된 것부터).
     * 내 기록만 돌려준다. 다른 사람이 이 쿠폰을 쓰려다 거절된 기록(REJECT)에는 그 사람의 사용자 번호와 이름이 있어서 뺀다.
     */
    public List<CouponHistoryItem> history(Long userId, Long couponId) {
        ownCoupon(userId, couponId);
        List<LedgerEntry> entries = ledgerRepository.findByCouponIdOrderByIdDesc(couponId).stream()
                .filter(e -> e.getUserId() == null || e.getUserId().equals(userId))
                .toList();
        Map<Long, String> names = merchantRepository.findAllById(
                        entries.stream().map(LedgerEntry::getMerchantId).filter(java.util.Objects::nonNull)
                                .collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Merchant::getId, Merchant::getName, (a, b) -> a));
        List<CouponHistoryItem> rows = new ArrayList<>(entries.stream()
                .map(e -> CouponHistoryItem.of(e, e.getMerchantId() == null ? null : names.get(e.getMerchantId())))
                .toList());
        Collections.reverse(rows);
        return rows;
    }

    /** GET /api/me/summary : 받은 쿠폰, 사용한 쿠폰, 아낀 금액 */
    public MySummaryResponse summary(Long userId) {
        List<Coupon> mine = couponRepository.findByUserIdOrderByIdDesc(userId);
        long received = mine.stream().filter(c -> c.getState() != CouponState.VOIDED).count();
        long used = mine.stream().filter(c -> c.getState() == CouponState.USED).count();
        // 아낀 금액은 구매 확정된 주문만 (취소·환불한 주문의 할인은 아낀 게 아니다)
        long saved = orderRepository.findByUserIdAndStatus(userId, OrderStatus.CONFIRMED).stream()
                .mapToLong(Order::getDiscountAmount).sum();
        return new MySummaryResponse(received, used, saved);
    }

    private Coupon ownCoupon(Long userId, Long couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!coupon.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.NOT_OWNER);
        }
        return coupon;
    }
}