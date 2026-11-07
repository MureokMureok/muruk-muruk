package com.murukmuruk.domain.order.service;

import com.murukmuruk.domain.campaign.support.DemoProduct;
import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.enums.CouponViewStatus;
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
import com.murukmuruk.global.util.TimeText;
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
            reject(new Ctx(actor, merchantId, userId, null, null, "", checksOf(null, userId, null, merchantId, false, null)),
                    ErrorCode.NOT_OWNER, "알 수 없는 쿠폰 · 내 쿠폰인가 확인 실패");
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
        // 거절할 때 같이 보낼 정보: 다섯 가지 확인 결과 (하나씩 따로 계산한다), 쿠폰 화면 상태, 사용·적용 시각, 가게 이름
        Ctx ctx = new Ctx(actor, merchantId, userId, couponId, coupon, couponShop.getName(),
                checksOf(coupon, userId, policy, merchantId, shop.isActive(), now));

        // 5가지 확인 (프론트 USE_CHECKS와 같은 순서): 내 쿠폰 → 쓸 수 있는 가게 → 유효기간 → 최소 주문 금액 → 안 쓴 쿠폰
        if (!coupon.getUserId().equals(userId)) {
            reject(ctx, ErrorCode.NOT_OWNER, label + "내 쿠폰인가 확인 실패");
        }
        if (!policy.getMerchantId().equals(merchantId) || !shop.isActive()) {
            reject(ctx, ErrorCode.WRONG_MERCHANT, label + "쓸 수 있는 가게인가 확인 실패");
        }
        if (!coupon.getExpiresAt().isAfter(now)) {
            reject(ctx, ErrorCode.COUPON_EXPIRED, label + "유효기간 안인가 확인 실패");
        }
        if (DemoProduct.PRICE < policy.getMinOrderAmount()) {
            reject(ctx, ErrorCode.MIN_ORDER_NOT_MET, label + "최소 주문 금액 확인 실패");
        }
        CouponState state = coupon.getState();
        if (state != CouponState.ACTIVE) {
            switch (state) {
                case PENDING -> reject(ctx, ErrorCode.COUPON_LOCKED, label + "구매 확정 전 쿠폰 사용 시도");
                case VOIDED -> reject(ctx, ErrorCode.COUPON_VOIDED, label + "소멸한 쿠폰 사용 시도");
                case IN_USE -> reject(ctx, ErrorCode.COUPON_ALREADY_USED, label + "처리 중 쿠폰 재사용 시도");
                default -> reject(ctx, ErrorCode.COUPON_ALREADY_USED, label + "이미 사용한 쿠폰 재사용 시도");
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
            reject(ctx, ErrorCode.COUPON_ALREADY_USED, label + "이미 사용한 쿠폰 재사용 시도");
        }

        // 체인 쿠폰 잠금. 검사 실패는 예외가 아니라 ok=false로 온다 (컨트랙트가 되돌리지 않고 거절 이벤트만 남기는 방식)
        LockResult lock = ChainCall.run(() -> chainClient.lockForPayment(
                tokenId, tokenOwnerWallet, merchantId, DemoProduct.PRICE, ChainRefs.payRef(orderId)));
        if (!lock.ok()) {
            reject(ctx, codeOf(lock.reason()), label + "체인 검사 거절 (" + lock.reason() + ")");
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

    /** 거절할 때 필요한 정보 묶음 */
    private record Ctx(String actor, Long merchantId, Long userId, Long couponId, Coupon coupon,
                       String merchantName, Map<String, Boolean> checks) {
    }

    /** 다섯 가지 확인 결과. 순서는 화면(USE_CHECKS)과 같다: owner, merchant, expiry, minOrder, unused */
    private Map<String, Boolean> checksOf(Coupon coupon, Long userId, CouponPolicy policy, Long merchantId,
                                          boolean shopActive, LocalDateTime now) {
        Map<String, Boolean> checks = new LinkedHashMap<>();
        boolean has = coupon != null && policy != null;
        checks.put("owner", has && coupon.getUserId().equals(userId));
        checks.put("merchant", has && policy.getMerchantId().equals(merchantId) && shopActive);
        checks.put("expiry", has && coupon.getExpiresAt().isAfter(now));
        checks.put("minOrder", has && DemoProduct.PRICE >= policy.getMinOrderAmount());
        checks.put("unused", has && coupon.getState() == CouponState.ACTIVE);
        return checks;
    }

    /** 에러 코드 → 실패한 확인 항목 이름 */
    private String failedKeyOf(ErrorCode code) {
        return switch (code) {
            case NOT_OWNER -> "owner";
            case WRONG_MERCHANT -> "merchant";
            case COUPON_EXPIRED -> "expiry";
            case MIN_ORDER_NOT_MET -> "minOrder";
            default -> "unused";
        };
    }

    /**
     * 거절: 기록(REJECT)을 새 트랜잭션으로 바로 커밋해 남기고, 에러를 던져 이 요청은 롤백한다.
     * 에러 응답의 result에는 다섯 가지 확인 결과(checks), 실패한 항목(failedKey), 쿠폰 상태, 사용·적용 시각, 가게 이름을 싣는다.
     * 단, 남의 쿠폰이면(로컬 소유자가 요청한 사람이 아니면) 쿠폰 정보가 새지 않게 failedKey만 알려 주고 나머지는 비운다.
     * 항상 예외를 던지므로 이 메서드 뒤의 코드는 실행되지 않는다.
     */
    private void reject(Ctx ctx, ErrorCode code, String detail) {
        Coupon coupon = ctx.coupon();
        // 로컬 기준 소유자가 아닌 사람의 요청. (체인이 NOT_OWNER를 돌려줬어도 로컬 소유자라면 해당하지 않는다)
        boolean foreign = coupon != null && !coupon.getUserId().equals(ctx.userId());
        String couponStatus = (coupon == null || foreign) ? null
                : CouponViewStatus.of(coupon.getState(), coupon.getExpiresAt(), LocalDateTime.now()).name();
        ledgerService.recordReject(detail, ctx.actor(), ctx.merchantId(), ctx.userId(), ctx.couponId(),
                code.getCode(), couponStatus);

        Map<String, Object> data = new LinkedHashMap<>();
        if (foreign) {
            // 남의 쿠폰: 다른 항목은 확인하지 않은 것으로 돌려준다 (쿠폰 상태·사용 시각·가게 이름 숨김)
            Map<String, Boolean> checks = new LinkedHashMap<>();
            checks.put("owner", false);
            checks.put("merchant", false);
            checks.put("expiry", false);
            checks.put("minOrder", false);
            checks.put("unused", false);
            data.put("checks", checks);
            data.put("failedKey", "owner");
            data.put("couponStatus", null);
            data.put("usedAt", null);
            data.put("merchantName", null);
        } else {
            data.put("checks", ctx.checks());
            data.put("failedKey", failedKeyOf(code));
            data.put("couponStatus", couponStatus);
            data.put("usedAt", coupon == null ? null : usedAtOf(coupon));
            data.put("merchantName", ctx.merchantName());
        }
        throw new BusinessException(code).withData(data);
    }

    /** 사용 완료면 사용 시각, 사용 처리 중이면 결제에 적용한 시각 */
    private String usedAtOf(Coupon coupon) {
        if (coupon.getUsedAt() != null) {
            return TimeText.at(coupon.getUsedAt());
        }
        if (coupon.getUsedOrderId() == null) {
            return null;
        }
        return orderRepository.findById(coupon.getUsedOrderId())
                .map(o -> TimeText.at(o.getCreatedAt())).orElse(null);
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