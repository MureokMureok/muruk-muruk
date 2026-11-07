package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.dto.MySummaryResponse;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.ledger.dto.LedgerRowResponse;
import com.murukmuruk.domain.ledger.repository.LedgerRepository;
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

/** 소비자: 내 쿠폰 (기획전 화면용 모양) 조회 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyCouponService {

    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final LedgerRepository ledgerRepository;
    private final CouponViewAssembler couponViewAssembler;

    /** GET /api/me/coupons : 내 쿠폰 전체 (최신 발급이 위) */
    public List<CouponViewItem> list(Long userId) {
        return couponViewAssembler.assemble(couponRepository.findByUserIdOrderByIdDesc(userId));
    }

    /** GET /api/me/coupons/{couponId} : 쿠폰 한 장 (내 쿠폰만) */
    public CouponViewItem detail(Long userId, Long couponId) {
        return couponViewAssembler.assemble(List.of(ownCoupon(userId, couponId))).get(0);
    }

    /** GET /api/me/coupons/{couponId}/history : 이 쿠폰의 발급·사용 기록 (오래된 것부터) */
    public List<LedgerRowResponse> history(Long userId, Long couponId) {
        ownCoupon(userId, couponId);
        List<LedgerRowResponse> rows = new ArrayList<>(
                ledgerRepository.findByCouponIdOrderByIdDesc(couponId).stream().map(LedgerRowResponse::from).toList());
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