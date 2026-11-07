package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.repository.CampaignRepository;
import com.murukmuruk.domain.coupon.dto.CouponViewItem;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponViewStatus;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.entity.Order;
import com.murukmuruk.domain.order.repository.OrderRepository;
import com.murukmuruk.global.util.MerchantLook;
import com.murukmuruk.global.util.TimeText;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 쿠폰 엔티티들을 화면용(CouponViewItem)으로 바꾼다. 정책·기획전·가게·주문을 한꺼번에 모아 조회한다. */
@Component
@RequiredArgsConstructor
public class CouponViewAssembler {

    private final CouponPolicyRepository couponPolicyRepository;
    private final CampaignRepository campaignRepository;
    private final MerchantRepository merchantRepository;
    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;

    public List<CouponViewItem> assemble(List<Coupon> coupons) {
        if (coupons.isEmpty()) {
            return List.of();
        }
        LocalDateTime now = LocalDateTime.now();

        Set<Long> policyIds = new HashSet<>();
        Set<Long> campaignIds = new HashSet<>();
        Set<Long> merchantIds = new HashSet<>();
        Set<Long> usedOrderIds = new HashSet<>();
        Set<Long> issuedOrderIds = new HashSet<>();
        for (Coupon c : coupons) {
            policyIds.add(c.getCouponPolicyId());
            if (c.getCampaignId() != null) {
                campaignIds.add(c.getCampaignId());
            }
            if (c.getFromMerchantId() != null) {
                merchantIds.add(c.getFromMerchantId());
            }
            if (c.getUsedOrderId() != null) {
                usedOrderIds.add(c.getUsedOrderId());
            }
            if (c.getIssuedOrderId() != null) {
                issuedOrderIds.add(c.getIssuedOrderId());
            }
        }
        Map<Long, CouponPolicy> policies = couponPolicyRepository.findAllById(policyIds).stream()
                .collect(Collectors.toMap(CouponPolicy::getId, Function.identity()));
        policies.values().forEach(p -> merchantIds.add(p.getMerchantId()));
        Map<Long, Merchant> merchants = merchantRepository.findAllById(merchantIds).stream()
                .collect(Collectors.toMap(Merchant::getId, Function.identity()));
        Map<Long, Campaign> campaigns = campaignIds.isEmpty() ? Map.of()
                : campaignRepository.findAllById(campaignIds).stream()
                  .collect(Collectors.toMap(Campaign::getId, Function.identity()));
        Map<Long, Order> usedOrders = usedOrderIds.isEmpty() ? Map.of()
                : orderRepository.findAllById(usedOrderIds).stream()
                  .collect(Collectors.toMap(Order::getId, Function.identity()));
        // 같은 구매로 받은 쿠폰 수 (구매 취소로 사라진 쿠폰도 센다)
        Map<Long, Long> togetherByOrder = issuedOrderIds.isEmpty() ? Map.of()
                : couponRepository.findByIssuedOrderIdIn(issuedOrderIds).stream()
                  .collect(Collectors.groupingBy(Coupon::getIssuedOrderId, Collectors.counting()));

        return coupons.stream().map(c -> {
            CouponPolicy policy = policies.get(c.getCouponPolicyId());
            Merchant target = merchants.get(policy.getMerchantId());
            Merchant from = c.getFromMerchantId() == null ? null : merchants.get(c.getFromMerchantId());
            Campaign campaign = c.getCampaignId() == null ? null : campaigns.get(c.getCampaignId());
            Order usedOrder = c.getUsedOrderId() == null ? null : usedOrders.get(c.getUsedOrderId());
            return new CouponViewItem(
                    c.getId(),
                    c.getCampaignId(),
                    campaign != null ? campaign.getTitle() : policy.getName(),
                    target.getId(),
                    target.getName(),
                    MerchantLook.shortName(target),
                    MerchantLook.color(target),
                    target.getCategory().name(),
                    policy.getDiscountAmount(),
                    policy.getMinOrderAmount(),
                    policy.getValidDays() == null ? "END" : "DAYS30",
                    TimeText.date(c.getExpiresAt()),
                    CouponViewStatus.of(c.getState(), c.getExpiresAt(), now),
                    TimeText.at(c.getCreatedAt()),
                    c.getFromMerchantId(),
                    from == null ? null : from.getName(),
                    c.getIssuedOrderId(),
                    c.getIssuedOrderId() == null ? 1 : togetherByOrder.getOrDefault(c.getIssuedOrderId(), 1L),
                    usedOrder == null ? null : usedOrder.getDiscountAmount(),
                    usedOrder == null ? null : TimeText.at(usedOrder.getCreatedAt()),
                    TimeText.at(c.getUsedAt()),
                    c.getUserId());
        }).toList();
    }
}