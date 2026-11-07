package com.murukmuruk.domain.order.service;

import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.entity.CampaignTerm;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import com.murukmuruk.domain.campaign.enums.TermValidity;
import com.murukmuruk.domain.campaign.repository.CampaignRepository;
import com.murukmuruk.domain.campaign.repository.CampaignTermRepository;
import com.murukmuruk.domain.campaign.support.DemoProduct;
import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.coupon.service.CouponViewAssembler;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.service.LedgerService;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.dto.MissedCouponView;
import com.murukmuruk.domain.order.dto.OrderView;
import com.murukmuruk.domain.order.dto.PurchaseResponse;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.repository.OrderRepository;
import com.murukmuruk.domain.order.support.ChainRefs;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.global.chain.ChainCall;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.chain.ChainClient.IssueResult;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.util.MerchantLook;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 구매: 모의 결제(주문 PAID) → 같은 기획전 다른 가게 쿠폰 발급(확정 대기, 잠김).
 * 한 트랜잭션이라 체인 호출이 실패하면 주문·발급 수량·쿠폰이 전부 롤백된다.
 * 쿠폰은 구매 확정(OrderStatusService.confirm) 후에 사용 가능해진다.
 */
@Service
@RequiredArgsConstructor
public class PurchaseService {

    private static final LocalTime END_OF_DAY = LocalTime.of(23, 59, 59);
    private static final String SOLD_OUT = "쿠폰이 모두 소진됐어요";

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final CampaignRepository campaignRepository;
    private final CampaignTermRepository campaignTermRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final LedgerService ledgerService;
    private final ChainClient chainClient;
    private final CouponViewAssembler couponViewAssembler;

    @Transactional
    public PurchaseResponse purchase(Long userId, Long merchantId) {
        // 같은 사용자의 동시 요청을 줄 세운다 (반드시 첫 쿼리)
        couponRepository.lockUser(userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        Merchant buyer = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!buyer.isActive()) {
            throw new BusinessException(ErrorCode.NOT_FOUND); // 승인된 가게에서만 살 수 있다
        }
        // 조건부 UPDATE 후에는 영속성 컨텍스트가 비워지므로 필요한 값을 먼저 꺼내 둔다
        String userWallet = user.getWalletAddress();
        String buyerName = buyer.getName();

        // 1. 모의 결제: 주문을 PAID로 저장
        Order order = orderRepository.saveAndFlush(Order.createPaid(
                userId, merchantId, DemoProduct.nameOf(buyerName), DemoProduct.PRICE, 0));
        Long orderId = order.getId();
        OrderView orderView = OrderView.of(order, null);

        // 2. 이 가게가 참여하는 진행 중 기획전 찾기
        LocalDate today = LocalDate.now();
        Set<Long> myCampaignIds = new HashSet<>();
        campaignTermRepository.findByMerchantId(merchantId).forEach(t -> myCampaignIds.add(t.getCampaignId()));
        List<Campaign> campaigns = campaignRepository.findByStatusOrderByIdAsc(CampaignStatus.ACTIVE).stream()
                .filter(c -> myCampaignIds.contains(c.getId()) && !c.isPastEnd(today))
                .toList();

        // 3. 기획전마다: 다른 가게 쿠폰 발급 대상 정하기 (한도가 남은 가게만. 발급 수 +1은 조건부 UPDATE)
        List<Coupon> issuedCoupons = new ArrayList<>();
        List<MissedCouponView> missed = new ArrayList<>();
        Map<Long, Merchant> merchantCache = new HashMap<>();

        for (Campaign campaign : campaigns) {
            List<CampaignTerm> targets = new ArrayList<>();
            List<CampaignTerm> terms = campaignTermRepository.findByCampaignId(campaign.getId());
            Set<Long> termMerchantIds = terms.stream().map(CampaignTerm::getMerchantId).collect(Collectors.toSet());
            merchantRepository.findAllById(termMerchantIds).forEach(m -> merchantCache.put(m.getId(), m));

            for (CampaignTerm term : terms) {
                if (term.getMerchantId().equals(merchantId) || !term.isRegistered()
                        || term.getCouponPolicyId() == null) {
                    continue;
                }
                Merchant target = merchantCache.get(term.getMerchantId());
                if (target == null || !target.isActive()) {
                    continue; // 정지된 가게 쿠폰은 새로 발급하지 않는다
                }
                if (couponPolicyRepository.increaseIssuedCount(term.getCouponPolicyId()) == 0) {
                    missed.add(missedView(campaign, term, target, SOLD_OUT));
                } else {
                    targets.add(term);
                }
            }
            if (targets.isEmpty()) {
                continue;
            }

            // 4. 체인에 발급 (확정 대기). 실패하면 예외로 전부 롤백된다
            List<Long> targetMerchantIds = targets.stream().map(CampaignTerm::getMerchantId).toList();
            Long campaignId = campaign.getId();
            String orderRef = ChainRefs.orderRef(orderId, campaignId);
            IssueResult result = ChainCall.run(() -> chainClient.issueForPurchase(
                    campaignId, merchantId, userWallet, orderRef, targetMerchantIds));

            // 5. 쿠폰 저장 + 기록
            for (CampaignTerm term : targets) {
                Long tokenId = result.tokenIdByMerchantId().get(term.getMerchantId());
                if (tokenId == null) {
                    throw new BusinessException(ErrorCode.CHAIN_ERROR);
                }
                LocalDateTime expiresAt = term.getValidity() == TermValidity.END
                        ? campaign.getEndsOn().atTime(END_OF_DAY)
                        : today.plusDays(30).atTime(END_OF_DAY);
                Coupon coupon = couponRepository.saveAndFlush(Coupon.issueForPurchase(
                        term.getCouponPolicyId(), userId, tokenId, expiresAt, orderId, campaignId, merchantId));
                issuedCoupons.add(coupon);
                ledgerService.record(LedgerType.ISSUE,
                        buyerName + " 구매로 " + merchantCache.get(term.getMerchantId()).getName() + " 쿠폰 발급",
                        buyerName, merchantId, userId, campaignId, coupon.getId(), orderId,
                        term.getDiscountAmount(), null, result.txHash());
            }
        }

        List<CouponViewItem> issuedViews = couponViewAssembler.assemble(issuedCoupons);
        return new PurchaseResponse(orderView, issuedViews, missed, false);
    }

    private MissedCouponView missedView(Campaign campaign, CampaignTerm term, Merchant target, String reason) {
        return new MissedCouponView(
                campaign.getId(), campaign.getTitle(), target.getId(), target.getName(),
                MerchantLook.shortName(target), MerchantLook.color(target),
                target.getCategory().name(),
                term.getDiscountAmount(), term.getMinOrderAmount(), term.getValidity().name(), reason);
    }
}