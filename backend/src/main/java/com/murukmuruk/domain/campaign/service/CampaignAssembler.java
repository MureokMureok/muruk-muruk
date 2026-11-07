package com.murukmuruk.domain.campaign.service;

import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.CampaignResponse.FlowRow;
import com.murukmuruk.domain.campaign.dto.CampaignResponse.ProductView;
import com.murukmuruk.domain.campaign.dto.CampaignResponse.TermView;
import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.entity.CampaignTerm;
import com.murukmuruk.domain.campaign.repository.CampaignTermRepository;
import com.murukmuruk.domain.campaign.support.DemoProduct;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.ledger.dto.LedgerRowResponse;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.repository.LedgerRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.util.MerchantLook;
import com.murukmuruk.global.util.TimeText;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 기획전 엔티티들을 화면용 응답(CampaignResponse)으로 조립한다.
 * 가게 정보, 발급·사용 숫자를 한꺼번에 모아서 조회한다 (기획전마다 따로 조회하지 않는다).
 * 호출하는 서비스의 트랜잭션 안에서 읽기만 한다.
 */
@Component
@RequiredArgsConstructor
public class CampaignAssembler {

    private final CampaignTermRepository campaignTermRepository;
    private final MerchantRepository merchantRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final CouponRepository couponRepository;
    private final LedgerRepository ledgerRepository;

    /** 기본 조립: 기획전 + 참여 가게 조건(숫자 포함) */
    public List<CampaignResponse> assemble(List<Campaign> campaigns) {
        return build(campaigns, false, false, false);
    }

    /** 상품까지 붙여 조립 (소비자 기획전 목록) */
    public List<CampaignResponse> assembleWithProduct(List<Campaign> campaigns) {
        return build(campaigns, true, false, false);
    }

    /** 손님 흐름까지 붙여 조립 (관리자 기획전 관리) */
    public List<CampaignResponse> assembleWithFlow(List<Campaign> campaigns) {
        return build(campaigns, false, true, false);
    }

    /** 조건 변경 이력까지 붙여 조립 (가게 참여 기획전 현황) */
    public List<CampaignResponse> assembleWithHistory(List<Campaign> campaigns) {
        return build(campaigns, false, false, true);
    }

    public CampaignResponse assembleOne(Campaign campaign) {
        return assemble(List.of(campaign)).get(0);
    }

    private List<CampaignResponse> build(List<Campaign> campaigns, boolean withProduct, boolean withFlow,
                                         boolean withHistory) {
        if (campaigns.isEmpty()) {
            return List.of();
        }
        LocalDate today = LocalDate.now();

        List<Long> campaignIds = campaigns.stream().map(Campaign::getId).toList();
        List<CampaignTerm> allTerms = campaignTermRepository.findByCampaignIdIn(campaignIds);
        Map<Long, List<CampaignTerm>> termsByCampaign = allTerms.stream()
                .sorted(Comparator.comparing(CampaignTerm::getId))
                .collect(Collectors.groupingBy(CampaignTerm::getCampaignId));

        // 가게 정보 한 번에
        Set<Long> merchantIds = allTerms.stream().map(CampaignTerm::getMerchantId).collect(Collectors.toSet());
        Map<Long, Merchant> merchants = merchantRepository.findAllById(merchantIds).stream()
                .collect(Collectors.toMap(Merchant::getId, Function.identity()));

        // 쿠폰 정책(시작 승인 후에만 있음)과 사용 완료 쿠폰
        Set<Long> policyIds = allTerms.stream().map(CampaignTerm::getCouponPolicyId)
                .filter(id -> id != null).collect(Collectors.toSet());
        Map<Long, CouponPolicy> policies = policyIds.isEmpty() ? Map.of()
                : couponPolicyRepository.findAllById(policyIds).stream()
                  .collect(Collectors.toMap(CouponPolicy::getId, Function.identity()));
        List<Coupon> usedCoupons = policyIds.isEmpty() ? List.of()
                : couponRepository.findByCouponPolicyIdInAndState(policyIds, CouponState.USED);
        Map<Long, Long> usedByPolicy = usedCoupons.stream()
                .collect(Collectors.groupingBy(Coupon::getCouponPolicyId, Collectors.counting()));

        List<CampaignResponse> result = new ArrayList<>();
        for (Campaign campaign : campaigns) {
            List<CampaignTerm> terms = termsByCampaign.getOrDefault(campaign.getId(), List.of());
            List<TermView> termViews = new ArrayList<>();
            for (CampaignTerm term : terms) {
                Merchant merchant = merchants.get(term.getMerchantId());
                if (merchant == null) {
                    continue; // 가게가 사라진 일은 없지만 방어
                }
                CouponPolicy policy = term.getCouponPolicyId() == null ? null : policies.get(term.getCouponPolicyId());
                long issued = policy == null ? 0 : policy.getIssuedCount();
                long used = policy == null ? 0 : usedByPolicy.getOrDefault(policy.getId(), 0L);
                long qtyTotal = term.getMaxIssue();
                ProductView product = withProduct
                        ? new ProductView(DemoProduct.nameOf(merchant.getName()), DemoProduct.PRICE) : null;
                termViews.add(new TermView(
                        merchant.getId(), merchant.getName(), MerchantLook.shortName(merchant),
                        MerchantLook.color(merchant), merchant.getCategory().name(),
                        term.getDiscountAmount(), term.getMinOrderAmount(), term.getValidity(), term.getCap(),
                        term.isRegistered(), issued, used, used * term.getDiscountAmount(),
                        qtyTotal, Math.max(0, qtyTotal - issued), product));
            }

            CampaignResponse response = new CampaignResponse(
                    campaign.getId(), campaign.getTitle(), TimeText.date(campaign.getStartsOn()),
                    TimeText.date(campaign.getEndsOn()), campaign.effectiveStatus(today),
                    termViews, null, null, null);

            if (withFlow) {
                response = response.withFlow(flowOf(campaign, terms, merchants, usedCoupons));
            }
            if (withHistory) {
                List<LedgerRowResponse> history = new ArrayList<>(
                        ledgerRepository.findByCampaignIdAndTypeOrderByIdDesc(campaign.getId(), LedgerType.ADMIN)
                                .stream().map(LedgerRowResponse::from).toList());
                response = response.withHistory(history);
            }
            result.add(response);
        }
        return result;
    }

    /** 가게 간 손님 흐름: 보낸 가게(구매한 곳) → 받은 가게(쿠폰을 실제로 쓴 곳)의 사용 수 */
    private List<FlowRow> flowOf(Campaign campaign, List<CampaignTerm> terms, Map<Long, Merchant> merchants,
                                 List<Coupon> usedCoupons) {
        // 정책 번호 → 쿠폰을 쓴 가게
        Map<Long, Long> merchantByPolicy = new HashMap<>();
        for (CampaignTerm term : terms) {
            if (term.getCouponPolicyId() != null) {
                merchantByPolicy.put(term.getCouponPolicyId(), term.getMerchantId());
            }
        }
        // (보낸 가게, 받은 가게) → 사용 수
        Map<String, Long> counts = new HashMap<>();
        for (Coupon coupon : usedCoupons) {
            if (!campaign.getId().equals(coupon.getCampaignId()) || coupon.getFromMerchantId() == null) {
                continue;
            }
            Long to = merchantByPolicy.get(coupon.getCouponPolicyId());
            if (to != null) {
                counts.merge(coupon.getFromMerchantId() + ":" + to, 1L, Long::sum);
            }
        }
        List<Long> ids = terms.stream().map(CampaignTerm::getMerchantId).toList();
        Set<Long> seen = new HashSet<>();
        List<FlowRow> rows = new ArrayList<>();
        for (Long from : ids) {
            if (!seen.add(from)) {
                continue;
            }
            List<Long> cells = new ArrayList<>();
            for (Long to : ids) {
                cells.add(from.equals(to) ? null : counts.getOrDefault(from + ":" + to, 0L));
            }
            Merchant merchant = merchants.get(from);
            rows.add(new FlowRow(from, merchant == null ? "" : merchant.getName(), cells));
        }
        return rows;
    }
}