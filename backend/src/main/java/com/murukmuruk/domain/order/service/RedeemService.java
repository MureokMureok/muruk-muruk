package com.murukmuruk.domain.order.service;

import com.murukmuruk.domain.campaign.support.DemoProduct;
import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.coupon.service.CouponViewAssembler;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.service.LedgerService;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.dto.OrderView;
import com.murukmuruk.domain.order.dto.RedeemResponse;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.repository.OrderRepository;
import com.murukmuruk.domain.order.support.ChainRefs;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.global.chain.ChainCall;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.chain.ChainClient.LockResult;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.util.MerchantLook;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 결제에 쿠폰 적용(쿠폰 사용 락업): 5가지 확인 → 주문(PAID) 저장 → 쿠폰 ACTIVE→IN_USE(조건부 UPDATE) → 체인 lockForPayment.
 * 쿠폰은 구매 확정(OrderStatusService.confirm) 때 USED가 된다. 확인에 실패하면 거절 기록(REJECT)을 남기고 에러를 돌려준다.
 */
@Service
@RequiredArgsConstructor
public class RedeemService {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final CouponRepository couponRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final OrderRepository orderRepository;
    private final LedgerService ledgerService;
    private final ChainClient chainClient;
    private final CouponViewAssembler couponViewAssembler;

    @Transactional
    public RedeemResponse redeem(Long userId, Long merchantId, Long couponId) {
        // 같은 사용자의 동시 요청을 줄 세운다 (반드시 첫 쿼리)
        couponRepository.lockUser(userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        Merchant shop = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        String shopName = shop.getName();
        String actor = "소비자 " + MerchantLook.maskName(user.getName());
        String userWallet = user.getWalletAddress();

        Coupon coupon = couponRepository.findById(couponId).orElse(null);
        if (coupon == null) {
            // 없는 쿠폰은 "내 쿠폰이 아님"으로 거절한다
            reject(ErrorCode.NOT_OWNER, "알 수 없는 쿠폰 · 내 쿠폰인가 확인 실패", actor, merchantId, userId, null);
        }
        CouponPolicy policy = couponPolicyRepository.findById(coupon.getCouponPolicyId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        // 기획전 쿠폰만 이 흐름으로 쓴다 (일반 쿠폰은 POST /api/coupons/{id}/use)
        if (policy.getReceiveType() != ReceiveType.CAMPAIGN) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        Merchant couponShop = merchantRepository.findById(policy.getMerchantId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        String label = couponShop.getName() + " 쿠폰 · ";

        LocalDateTime now = LocalDateTime.now();

        // 5가지 확인 (프론트 USE_CHECKS와 같은 순서): 내 쿠폰 → 쓸 수 있는 가게 → 유효기간 → 최소 주문 금액 → 안 쓴 쿠폰
        if (!coupon.getUserId().equals(userId)) {
            reject(ErrorCode.NOT_OWNER, label + "내 쿠폰인가 확인 실패", actor, merchantId, userId, couponId);
        }
        if (!policy.getMerchantId().equals(merchantId) || !shop.isActive()) {
            reject(ErrorCode.WRONG_MERCHANT, label + "쓸 수 있는 가게인가 확인 실패", actor, merchantId, userId, couponId);
        }
        if (!coupon.getExpiresAt().isAfter(now)) {
            reject(ErrorCode.COUPON_EXPIRED, label + "유효기간 안인가 확인 실패", actor, merchantId, userId, couponId);
        }
        if (DemoProduct.PRICE < policy.getMinOrderAmount()) {
            reject(ErrorCode.MIN_ORDER_NOT_MET, label + "최소 주문 금액 확인 실패", actor, merchantId, userId, couponId);
        }
        CouponState state = coupon.getState();
        if (state != CouponState.ACTIVE) {
            switch (state) {
                case PENDING -> reject(ErrorCode.COUPON_LOCKED, label + "구매 확정 전 쿠폰 사용 시도",
                        actor, merchantId, userId, couponId);
                case VOIDED -> reject(ErrorCode.COUPON_VOIDED, label + "소멸한 쿠폰 사용 시도",
                        actor, merchantId, userId, couponId);
                case IN_USE -> reject(ErrorCode.COUPON_ALREADY_USED, label + "처리 중 쿠폰 재사용 시도",
                        actor, merchantId, userId, couponId);
                default -> reject(ErrorCode.COUPON_ALREADY_USED, label + "이미 사용한 쿠폰 재사용 시도",
                        actor, merchantId, userId, couponId);
            }
        }

        // 할인 금액 = min(쿠폰 할인 금액, 상품 금액)
        long discount = Math.min(policy.getDiscountAmount(), DemoProduct.PRICE);
        String tokenOwnerWallet = userWallet;
        long tokenId = coupon.getTokenId();

        // 주문(PAID)을 먼저 저장한다 (쿠폰의 used_order_id가 주문을 가리키므로)
        Order order = orderRepository.saveAndFlush(Order.createPaid(
                userId, merchantId, DemoProduct.nameOf(shopName), DemoProduct.PRICE, discount));
        Long orderId = order.getId();

        // 쿠폰을 IN_USE로: 아직 ACTIVE이고 만료 전일 때만 1행이 바뀐다 (동시에 두 결제에 쓰는 것을 막는다)
        if (couponRepository.lockForUse(couponId, orderId, now) == 0) {
            reject(ErrorCode.COUPON_ALREADY_USED, label + "이미 사용한 쿠폰 재사용 시도", actor, merchantId, userId, couponId);
        }

        // 체인 쿠폰 잠금. 검사 실패는 예외가 아니라 ok=false로 온다 (컨트랙트가 되돌리지 않고 거절 이벤트만 남기는 방식)
        LockResult lock = ChainCall.run(() -> chainClient.lockForPayment(
                tokenId, tokenOwnerWallet, merchantId, DemoProduct.PRICE, ChainRefs.payRef(orderId)));
        if (!lock.ok()) {
            reject(codeOf(lock.reason()), label + "체인 검사 거절 (" + lock.reason() + ")",
                    actor, merchantId, userId, couponId);
        }

        ledgerService.record(LedgerType.APPLY,
                shopName + " 결제에 쿠폰 적용 · " + MerchantLook.won(discount), shopName,
                merchantId, userId, coupon.getCampaignId(), couponId, orderId,
                discount, DemoProduct.PRICE, lock.txHash());

        // 조건부 UPDATE 후 영속성 컨텍스트가 비워졌으므로 다시 조회해 응답을 만든다
        Order saved = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR));
        Coupon fresh = couponRepository.findById(couponId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR));
        CouponViewItem view = couponViewAssembler.assemble(java.util.List.of(fresh)).get(0);

        Map<String, Boolean> checks = new LinkedHashMap<>();
        checks.put("owner", true);
        checks.put("merchant", true);
        checks.put("expiry", true);
        checks.put("minOrder", true);
        checks.put("unused", true);
        return new RedeemResponse(OrderView.of(saved, couponId), view, checks, false);
    }

    /**
     * 거절: 기록(REJECT)을 새 트랜잭션으로 바로 커밋해 남기고, 에러를 던져 이 요청은 롤백한다.
     * 항상 예외를 던지므로 이 메서드 뒤의 코드는 실행되지 않는다.
     */
    private void reject(ErrorCode code, String detail, String actor, Long merchantId, Long userId, Long couponId) {
        ledgerService.recordReject(detail, actor, merchantId, userId, couponId);
        throw new BusinessException(code);
    }

    /** 체인이 알려 준 거절 사유 → 에러 코드 */
    private ErrorCode codeOf(String reason) {
        if (reason == null) {
            return ErrorCode.INVALID_STATUS;
        }
        return switch (reason.toUpperCase()) {
            case "NOT_OWNER" -> ErrorCode.NOT_OWNER;
            case "WRONG_MERCHANT" -> ErrorCode.WRONG_MERCHANT;
            case "EXPIRED" -> ErrorCode.COUPON_EXPIRED;
            case "MIN_ORDER", "MIN_ORDER_NOT_MET" -> ErrorCode.MIN_ORDER_NOT_MET;
            case "ALREADY_USED", "USED", "IN_USE", "PROCESSING" -> ErrorCode.COUPON_ALREADY_USED;
            case "LOCKED", "PENDING" -> ErrorCode.COUPON_LOCKED;
            case "VOIDED" -> ErrorCode.COUPON_VOIDED;
            default -> ErrorCode.INVALID_STATUS;
        };
    }
}