package com.murukmuruk.domain.campaign.service;

import com.murukmuruk.domain.campaign.dto.CampaignCreateRequest;
import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.CampaignStatusRequest;
import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.entity.CampaignTerm;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import com.murukmuruk.domain.campaign.enums.TermValidity;
import com.murukmuruk.domain.campaign.repository.CampaignRepository;
import com.murukmuruk.domain.campaign.repository.CampaignTermRepository;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.enums.UsableScope;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.service.LedgerService;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.chain.ChainCall;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** KCP 관리자: 기획전 만들기, 상태 바꾸기 (시작 승인·일시 중지·다시 진행·종료) */
@Service
@RequiredArgsConstructor
public class CampaignAdminService {

    private static final int MIN_SHOPS = 2;   // 컨트랙트: 참여 가게 2~20곳
    private static final int MAX_SHOPS = 20;
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private final CampaignRepository campaignRepository;
    private final CampaignTermRepository campaignTermRepository;
    private final MerchantRepository merchantRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final LedgerService ledgerService;
    private final ChainClient chainClient;
    private final CampaignAssembler assembler;

    /** 새 기획전: 입력 검증 → 저장(준비 중) → 참여 가게마다 기본 조건 → 체인 등록. 체인이 실패하면 전부 롤백. */
    @Transactional
    public CampaignResponse create(CampaignCreateRequest request) {
        if (request == null || request.title() == null || request.title().isBlank()
                || request.title().length() > 100) {
            throw new BusinessException(ErrorCode.INVALID, "기획전 이름을 입력해 주세요.");
        }
        if (request.startDate() == null || request.endDate() == null
                || request.endDate().isBefore(request.startDate())) {
            throw new BusinessException(ErrorCode.INVALID, "기간을 확인해 주세요.");
        }
        List<Long> merchantIds = request.merchantIds() == null ? List.of()
                : request.merchantIds().stream().filter(id -> id != null).distinct().toList();
        if (merchantIds.size() < MIN_SHOPS || merchantIds.size() > MAX_SHOPS) {
            throw new BusinessException(ErrorCode.INVALID, "참여 가게를 2곳 이상 20곳 이하로 골라 주세요.");
        }
        // 참여 가게는 모두 승인된(ACTIVE) 가게여야 한다
        List<Merchant> merchants = merchantRepository.findAllById(merchantIds);
        if (merchants.size() != merchantIds.size() || merchants.stream().anyMatch(m -> !m.isActive())) {
            throw new BusinessException(ErrorCode.INVALID, "승인된 가게만 고를 수 있어요.");
        }

        String title = request.title().trim();
        Campaign campaign = campaignRepository.saveAndFlush(
                Campaign.create(title, request.startDate(), request.endDate()));
        for (Long merchantId : merchantIds) {
            campaignTermRepository.save(CampaignTerm.createDefault(campaign.getId(), merchantId));
        }
        campaignTermRepository.flush();

        // 체인에 기획전 등록 (시각은 unix seconds: 시작일 0시 ~ 종료일 끝)
        long startsAt = request.startDate().atStartOfDay(ZONE).toEpochSecond();
        long endsAt = request.endDate().plusDays(1).atStartOfDay(ZONE).toEpochSecond() - 1;
        String txHash = ChainCall.run(() ->
                chainClient.createCampaign(campaign.getId(), merchantIds, startsAt, endsAt));

        ledgerService.record(LedgerType.ADMIN,
                title + " 만들기 (참여 가게 " + merchantIds.size() + "곳)", "KCP",
                null, null, campaign.getId(), null, null, null, null, txHash);

        return assembler.assembleOne(campaign);
    }

    /**
     * 기획전 상태 바꾸기.
     * - 가능한 변경: 준비 중→진행 중, 진행 중→일시 중지·종료, 일시 중지→진행 중·종료 (아니면 INVALID_STATUS)
     * - 준비 중→진행 중(시작 승인)은 참여 가게가 모두 조건을 등록해야 하고(NOT_READY),
     *   이때 가게마다 쿠폰 정책(coupon_policy)을 만들어 연결한다.
     */
    @Transactional
    public CampaignResponse changeStatus(Long campaignId, CampaignStatusRequest request) {
        if (request == null || request.status() == null) {
            throw new BusinessException(ErrorCode.INVALID, "바꿀 상태를 알려 주세요.");
        }
        CampaignStatus next = request.status();

        // 같은 기획전을 동시에 바꾸지 못하게 행을 잠근다 (가게의 조건 저장과도 겹치지 않는다)
        Campaign campaign = campaignRepository.findForUpdate(campaignId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        CampaignStatus current = campaign.getStatus();

        if (!current.canMoveTo(next)) {
            throw new BusinessException(ErrorCode.INVALID_STATUS);
        }
        // 종료일이 지난 기획전은 다시 진행할 수 없다
        if (next == CampaignStatus.ACTIVE && campaign.isPastEnd(LocalDate.now())) {
            throw new BusinessException(ErrorCode.INVALID_STATUS, "종료일이 지난 기획전은 다시 시작할 수 없어요.");
        }

        if (current == CampaignStatus.PREPARING) {
            List<CampaignTerm> terms = campaignTermRepository.findByCampaignId(campaignId);
            if (terms.isEmpty() || !terms.stream().allMatch(CampaignTerm::isRegistered)) {
                throw new BusinessException(ErrorCode.NOT_READY);
            }
            createPolicies(campaign, terms);
        }

        String txHash = ChainCall.run(() -> chainClient.setCampaignStatus(campaignId, next.name()));
        campaign.changeStatus(next);

        String label = switch (next) {
            case ACTIVE -> current == CampaignStatus.PAUSED ? "다시 진행" : "진행 중으로 바꿈";
            case PAUSED -> "일시 중지";
            case ENDED -> "종료";
            case PREPARING -> "준비 중"; // 도달하지 않음
        };
        ledgerService.record(LedgerType.ADMIN, campaign.getTitle() + " " + label, "KCP",
                null, null, campaignId, null, null, null, null, txHash);

        campaignRepository.flush();
        return assembler.assembleOne(campaign);
    }

    /** 시작 승인 때: 가게마다 쿠폰 정책을 만들고 조건(term)에 연결한다 (최대 발급 수 = 한도 ÷ 할인 금액) */
    private void createPolicies(Campaign campaign, List<CampaignTerm> terms) {
        Set<Long> ids = new HashSet<>();
        terms.forEach(t -> ids.add(t.getMerchantId()));
        Map<Long, Merchant> merchants = merchantRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Merchant::getId, Function.identity()));

        for (CampaignTerm term : terms) {
            Merchant merchant = merchants.get(term.getMerchantId());
            if (merchant == null || !merchant.isActive()) {
                throw new BusinessException(ErrorCode.NOT_READY, "참여 가게 중 사용할 수 없는 가게가 있어요.");
            }
            int quantity = (int) Math.min(term.getMaxIssue(), Integer.MAX_VALUE);
            if (quantity < 1) {
                throw new BusinessException(ErrorCode.NOT_READY);
            }
            // 기획전 쿠폰은 유효기간을 발급 시점에 계산한다 (DAYS30은 30일, END는 종료일까지라 valid_days 없음)
            Integer validDays = term.getValidity() == TermValidity.DAYS30 ? 30 : null;
            CouponPolicy policy = couponPolicyRepository.saveAndFlush(CouponPolicy.create(
                    merchant.getId(), campaign.getTitle() + " · " + merchant.getName() + " 쿠폰",
                    term.getDiscountAmount(), ReceiveType.CAMPAIGN, null, term.getMinOrderAmount(),
                    validDays, UsableScope.CAMPAIGN_MERCHANTS, quantity));
            term.attachPolicy(policy.getId());
        }
        campaignTermRepository.flush();
    }

    /** 관리자 기획전 관리 화면: 전체 기획전 + 손님 흐름 */
    @Transactional(readOnly = true)
    public List<CampaignResponse> list() {
        return assembler.assembleWithFlow(new ArrayList<>(campaignRepository.findAllByOrderByIdAsc()));
    }
}