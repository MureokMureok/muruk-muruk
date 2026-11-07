package com.murukmuruk.domain.campaign.service;

import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.ProductResponse;
import com.murukmuruk.domain.campaign.dto.PurchasePreviewResponse;
import com.murukmuruk.domain.campaign.dto.PurchasePreviewResponse.PreviewCoupon;
import com.murukmuruk.domain.campaign.entity.CampaignTerm;
import com.murukmuruk.domain.campaign.enums.TermValidity;
import com.murukmuruk.domain.campaign.repository.CampaignTermRepository;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import com.murukmuruk.domain.campaign.repository.CampaignRepository;
import com.murukmuruk.domain.campaign.support.DemoProduct;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.util.MerchantLook;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 소비자(로그인 없이) 기획전 조회 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampaignQueryService {

    private final CampaignRepository campaignRepository;
    private final MerchantRepository merchantRepository;
    private final CampaignAssembler assembler;
    private final CampaignTermRepository campaignTermRepository;
    private final CouponPolicyRepository couponPolicyRepository;

    /** GET /api/campaigns : 기획전 목록. 참여 가게(terms)마다 상품(product)이 들어 있다 */
    public List<CampaignResponse> list() {
        return assembler.assembleWithProduct(campaignRepository.findAllByOrderByIdAsc());
    }

    /**
     * GET /api/campaigns/current : 소비자 화면의 기획전.
     * 진행 중인 기획전 중 가장 먼저 만든 것. 없으면 가장 최근 기획전. 기획전이 하나도 없으면 404.
     */
    public CampaignResponse current() {
        List<Campaign> all = campaignRepository.findAllByOrderByIdAsc();
        LocalDate today = LocalDate.now();
        Campaign chosen = all.stream()
                .filter(c -> c.effectiveStatus(today) == CampaignStatus.ACTIVE)
                .findFirst()
                .orElse(all.isEmpty() ? null : all.get(all.size() - 1));
        if (chosen == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "진행 중인 기획전이 없어요.");
        }
        return assembler.assembleOne(chosen);
    }

    /** GET /api/merchants/{id}/product : 가게 상품 (시연용 대표 상품 1개) */
    public ProductResponse product(Long merchantId) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return new ProductResponse(
                merchant.getId(), DemoProduct.nameOf(merchant.getName()), DemoProduct.PRICE,
                merchant.getName(), MerchantLook.shortName(merchant), MerchantLook.color(merchant),
                merchant.getCategory().name());
    }

    /**
     * GET /api/merchants/{id}/purchase-preview : 이 가게에서 사면 받을 쿠폰 미리보기.
     * 구매(PurchaseService)와 같은 규칙으로 계산하되 아무것도 저장하지 않는다.
     * 진행 중인 기획전에서만 쿠폰이 나오고, 한도가 다 찬 가게 쿠폰은 missed로 나온다.
     */
    public PurchasePreviewResponse preview(Long merchantId) {
        Merchant buyer = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDate today = LocalDate.now();

        Set<Long> myCampaignIds = new HashSet<>();
        campaignTermRepository.findByMerchantId(buyer.getId()).forEach(t -> myCampaignIds.add(t.getCampaignId()));
        List<Campaign> mine = campaignRepository.findAllById(myCampaignIds).stream()
                .sorted((a, b) -> Long.compare(a.getId(), b.getId())).toList();
        if (mine.isEmpty()) {
            return new PurchasePreviewResponse(null, List.of(), List.of());
        }
        // 화면에 보여줄 기획전 상태: 진행 중인 것이 있으면 그것, 없으면 가장 최근 것
        CampaignStatus shown = mine.stream().map(c -> c.effectiveStatus(today))
                .filter(s -> s == CampaignStatus.ACTIVE).findFirst()
                .orElse(mine.get(mine.size() - 1).effectiveStatus(today));

        List<PreviewCoupon> coupons = new ArrayList<>();
        List<PreviewCoupon> missed = new ArrayList<>();
        for (Campaign campaign : mine) {
            if (campaign.effectiveStatus(today) != CampaignStatus.ACTIVE) {
                continue;
            }
            List<CampaignTerm> terms = campaignTermRepository.findByCampaignId(campaign.getId());
            Map<Long, Merchant> merchants = merchantRepository
                    .findAllById(terms.stream().map(CampaignTerm::getMerchantId).collect(Collectors.toSet()))
                    .stream().collect(Collectors.toMap(Merchant::getId, Function.identity()));
            Set<Long> policyIds = terms.stream().map(CampaignTerm::getCouponPolicyId)
                    .filter(id -> id != null).collect(Collectors.toSet());
            Map<Long, CouponPolicy> policies = couponPolicyRepository.findAllById(policyIds).stream()
                    .collect(Collectors.toMap(CouponPolicy::getId, Function.identity()));

            for (CampaignTerm term : terms) {
                Merchant target = merchants.get(term.getMerchantId());
                if (target == null || term.getMerchantId().equals(merchantId) || !term.isRegistered()
                        || term.getCouponPolicyId() == null || !target.isActive()) {
                    continue;
                }
                CouponPolicy policy = policies.get(term.getCouponPolicyId());
                boolean soldOut = policy == null || policy.getRemainingCount() <= 0;
                String expiresAt = term.getValidity() == TermValidity.END
                        ? campaign.getEndsOn().toString() : today.plusDays(30).toString();
                PreviewCoupon coupon = new PreviewCoupon(
                        campaign.getId(), campaign.getTitle(), target.getId(), target.getName(),
                        MerchantLook.shortName(target), MerchantLook.color(target), target.getCategory().name(),
                        term.getDiscountAmount(), term.getMinOrderAmount(), term.getValidity().name(), expiresAt,
                        soldOut ? "쿠폰이 모두 소진됐어요" : null);
                (soldOut ? missed : coupons).add(coupon);
            }
        }
        return new PurchasePreviewResponse(shown, coupons, missed);
    }
}