package com.murukmuruk.domain.order.service;

import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.enums.CouponViewStatus;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.coupon.service.CouponViewAssembler;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.service.LedgerService;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.dto.CancelResponse;
import com.murukmuruk.domain.order.dto.ConfirmResponse;
import com.murukmuruk.domain.order.dto.OrderView;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.enums.OrderStatus;
import com.murukmuruk.domain.order.repository.OrderRepository;
import com.murukmuruk.domain.order.support.ChainRefs;
import com.murukmuruk.global.chain.ChainCall;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.util.MerchantLook;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 구매 확정 / 주문 취소·환불.
 *  - 구매 주문(쿠폰을 발급받은 주문): 확정 → 쿠폰 PENDING→ACTIVE / 취소 → 쿠폰 PENDING→VOIDED (그 가게의 발급 수도 되돌린다)
 *  - 쿠폰 적용 주문(쿠폰을 쓴 결제):  확정 → 쿠폰 IN_USE→USED   / 취소 → 쿠폰 IN_USE→ACTIVE (복원)
 * 주문 상태는 PAID일 때만 바뀐다 (조건부 UPDATE라 같은 주문을 동시에 확정·취소해도 한 번만 처리된다).
 */
@Service
@RequiredArgsConstructor
public class OrderStatusService {

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final MerchantRepository merchantRepository;
    private final LedgerService ledgerService;
    private final ChainClient chainClient;
    private final CouponViewAssembler couponViewAssembler;

    /** 구매 확정 */
    @Transactional
    public ConfirmResponse confirm(Long userId, Long orderId) {
        couponRepository.lockUser(userId); // 같은 사용자의 요청을 줄 세운다 (첫 쿼리)

        Order order = ownOrder(userId, orderId);
        if (order.getStatus() != OrderStatus.PAID) {
            throw new BusinessException(ErrorCode.ORDER_NOT_PAID);
        }
        Long merchantId = order.getMerchantId();
        long amount = order.getTotalAmount();
        String shop = merchantName(merchantId);

        List<Coupon> pending = couponRepository.findByIssuedOrderId(orderId).stream()
                .filter(c -> c.getState() == CouponState.PENDING).toList();
        List<Coupon> inUse = couponRepository.findByUsedOrderId(orderId).stream()
                .filter(c -> c.getState() == CouponState.IN_USE).toList();
        Map<Long, String> targetNames = targetNames(pending, inUse);

        // 주문 상태 PAID → CONFIRMED (0건이면 그 사이 다른 요청이 처리함)
        if (orderRepository.transition(orderId, OrderStatus.PAID.name(), OrderStatus.CONFIRMED.name()) == 0) {
            throw new BusinessException(ErrorCode.ORDER_NOT_PAID);
        }

        LocalDateTime now = LocalDateTime.now();

        // 구매 확정: 잠긴 쿠폰이 사용 가능해진다 (기획전별로 체인 확정)
        if (!pending.isEmpty()) {
            Map<Long, String> txByCampaign = new HashMap<>();
            for (Long campaignId : pending.stream().map(Coupon::getCampaignId).distinct().toList()) {
                String ref = ChainRefs.orderRef(orderId, campaignId);
                txByCampaign.put(campaignId, ChainCall.run(() -> chainClient.confirmPurchase(ref)));
            }
            couponRepository.activatePending(orderId);
            for (Coupon c : pending) {
                ledgerService.record(LedgerType.CONFIRM,
                        shop + " 구매 확정 · " + targetNames.get(c.getId()) + " 쿠폰 사용 가능", shop,
                        merchantId, userId, c.getCampaignId(), c.getId(), orderId, null, null,
                        txByCampaign.get(c.getCampaignId()));
            }
        }

        // 결제 확정: 처리 중이던 쿠폰이 사용 완료가 된다 (이때부터 가게의 할인 부담)
        if (!inUse.isEmpty()) {
            String tx = ChainCall.run(() -> chainClient.confirmPayment(ChainRefs.payRef(orderId)));
            couponRepository.confirmUse(orderId, now);
            for (Coupon c : inUse) {
                ledgerService.record(LedgerType.USE,
                        shop + " " + MerchantLook.won(order.getDiscountAmount()) + " · 결제 " + MerchantLook.won(amount),
                        shop, merchantId, userId, c.getCampaignId(), c.getId(), orderId,
                        order.getDiscountAmount(), amount, tx);
            }
        }

        // 조건부 UPDATE 후 영속성 컨텍스트가 비워졌으므로 다시 조회해 응답을 만든다
        Order saved = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR));
        List<Coupon> changed = inUse.isEmpty()
                ? couponRepository.findByIssuedOrderId(orderId)
                : couponRepository.findByUsedOrderId(orderId);
        Long appliedCouponId = inUse.isEmpty() ? null : inUse.get(0).getId();

        List<CouponViewItem> left = couponViewAssembler.assemble(couponRepository.findByUserIdOrderByIdDesc(userId))
                .stream().filter(c -> c.status() == CouponViewStatus.AVAILABLE).toList();
        return new ConfirmResponse(OrderView.of(saved, appliedCouponId), couponViewAssembler.assemble(changed), left);
    }

    /** 주문 취소·환불. 구매 확정 후에는 단순 변심 환불 불가 (ORDER_CONFIRMED) */
    @Transactional
    public CancelResponse cancel(Long userId, Long orderId) {
        couponRepository.lockUser(userId);

        Order order = ownOrder(userId, orderId);
        if (order.getStatus() == OrderStatus.CONFIRMED) {
            throw new BusinessException(ErrorCode.ORDER_CONFIRMED);
        }
        if (order.getStatus() != OrderStatus.PAID) {
            throw new BusinessException(ErrorCode.ORDER_NOT_PAID);
        }
        Long merchantId = order.getMerchantId();
        String shop = merchantName(merchantId);

        List<Coupon> pending = couponRepository.findByIssuedOrderId(orderId).stream()
                .filter(c -> c.getState() == CouponState.PENDING).toList();
        List<Coupon> inUse = couponRepository.findByUsedOrderId(orderId).stream()
                .filter(c -> c.getState() == CouponState.IN_USE).toList();
        Map<Long, String> targetNames = targetNames(pending, inUse);

        // 주문 상태 PAID → CANCELLED
        if (orderRepository.transition(orderId, OrderStatus.PAID.name(), OrderStatus.CANCELLED.name()) == 0) {
            throw new BusinessException(ErrorCode.ORDER_NOT_PAID);
        }

        // 구매 취소: 잠긴 쿠폰이 소멸하고, 그 가게의 발급 수가 되돌아간다 (다른 손님에게 다시 나갈 수 있다)
        if (!pending.isEmpty()) {
            Map<Long, String> txByCampaign = new HashMap<>();
            for (Long campaignId : pending.stream().map(Coupon::getCampaignId).distinct().toList()) {
                String ref = ChainRefs.orderRef(orderId, campaignId);
                txByCampaign.put(campaignId, ChainCall.run(() -> chainClient.cancelPurchase(ref)));
            }
            couponRepository.voidPending(orderId);
            for (Coupon c : pending) {
                couponPolicyRepository.decreaseIssuedCount(c.getCouponPolicyId());
                ledgerService.record(LedgerType.REFUND,
                        shop + " 주문 취소 · " + targetNames.get(c.getId()) + " 쿠폰 소멸", shop,
                        merchantId, userId, c.getCampaignId(), c.getId(), orderId, null, null,
                        txByCampaign.get(c.getCampaignId()));
            }
        }

        // 결제 취소: 처리 중이던 쿠폰이 사용 가능으로 복원된다
        if (!inUse.isEmpty()) {
            String tx = ChainCall.run(() -> chainClient.cancelPayment(ChainRefs.payRef(orderId)));
            couponRepository.restoreUse(orderId);
            LocalDateTime now = LocalDateTime.now();
            for (Coupon c : inUse) {
                boolean late = !c.getExpiresAt().isAfter(now);
                ledgerService.record(LedgerType.REFUND,
                        shop + " 주문 취소·환불 · " + (late ? "유효기간이 지나 쿠폰 만료" : "쿠폰 복원"), shop,
                        merchantId, userId, c.getCampaignId(), c.getId(), orderId, null, null, tx);
            }
        }

        Order saved = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR));
        // 쿠폰 적용 주문이었다면 그 쿠폰, 구매 주문이었다면 발급됐던 쿠폰들을 돌려준다
        List<Coupon> changed = inUse.isEmpty()
                ? couponRepository.findByIssuedOrderId(orderId)
                : couponRepository.findByUserIdOrderByIdDesc(userId).stream()
                  .filter(c -> inUse.stream().anyMatch(u -> u.getId().equals(c.getId()))).toList();
        Long appliedCouponId = inUse.isEmpty() ? null : inUse.get(0).getId();
        return new CancelResponse(OrderView.of(saved, appliedCouponId), couponViewAssembler.assemble(changed));
    }

    /** 내 주문인지 확인 (아니면 ORDER_NOT_FOUND) */
    private Order ownOrder(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }
        return order;
    }

    private String merchantName(Long merchantId) {
        return merchantRepository.findById(merchantId).map(Merchant::getName).orElse("");
    }

    /** 쿠폰 번호 → 그 쿠폰을 쓸 수 있는 가게 이름 (기록 문구용) */
    private Map<Long, String> targetNames(List<Coupon> first, List<Coupon> second) {
        List<Coupon> all = new java.util.ArrayList<>(first);
        all.addAll(second);
        if (all.isEmpty()) {
            return Map.of();
        }
        Map<Long, CouponPolicy> policies = couponPolicyRepository
                .findAllById(all.stream().map(Coupon::getCouponPolicyId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(CouponPolicy::getId, p -> p));
        Map<Long, Merchant> merchants = merchantRepository
                .findAllById(policies.values().stream().map(CouponPolicy::getMerchantId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Merchant::getId, m -> m));
        Map<Long, String> names = new HashMap<>();
        for (Coupon c : all) {
            Merchant m = merchants.get(policies.get(c.getCouponPolicyId()).getMerchantId());
            names.put(c.getId(), m == null ? "" : m.getName());
        }
        return names;
    }
}