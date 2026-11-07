package com.murukmuruk.domain.campaign.service;

import com.murukmuruk.domain.campaign.dto.CampaignResponse;
import com.murukmuruk.domain.campaign.dto.CampaignResponse.TermView;
import com.murukmuruk.domain.campaign.dto.TermUpdateRequest;
import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.entity.CampaignTerm;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import com.murukmuruk.domain.campaign.repository.CampaignRepository;
import com.murukmuruk.domain.campaign.repository.CampaignTermRepository;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.service.LedgerService;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.chain.ChainCall;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import com.murukmuruk.global.util.MerchantLook;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** 가맹점: 참여 기획전 보기, 우리 가게 쿠폰 조건 저장 */
@Service
@RequiredArgsConstructor
public class CampaignMerchantService {

    private final CampaignRepository campaignRepository;
    private final CampaignTermRepository campaignTermRepository;
    private final MerchantRepository merchantRepository;
    private final LedgerService ledgerService;
    private final ChainClient chainClient;
    private final CampaignAssembler assembler;

    /** 이 가게가 참여한 기획전 + 가게 조건 + 숫자 + 조건 변경 이력 */
    @Transactional(readOnly = true)
    public List<CampaignResponse> myCampaigns(Long merchantId) {
        List<Long> campaignIds = campaignTermRepository.findByMerchantId(merchantId).stream()
                .map(CampaignTerm::getCampaignId).toList();
        List<Campaign> campaigns = campaignRepository.findAllById(campaignIds).stream()
                .sorted((a, b) -> Long.compare(a.getId(), b.getId())).toList();
        return assembler.assembleWithHistory(campaigns).stream()
                .map(c -> withMine(c, merchantId)).toList();
    }

    /**
     * 우리 가게 쿠폰 조건 저장. 준비 중(PREPARING)인 기획전만 바꿀 수 있다 (아니면 LOCKED).
     * register가 true면 "기획전에 등록하기"(체인에 조건 등록 + 기록), 아니면 임시 저장.
     */
    @Transactional
    public CampaignResponse saveTerms(Long merchantId, Long campaignId, TermUpdateRequest request) {
        if (request == null || request.validity() == null || request.value() == null
                || request.minOrder() == null || request.cap() == null) {
            throw new BusinessException(ErrorCode.INVALID);
        }
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN));
        if (!merchant.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 관리자의 상태 변경과 겹치지 않게 기획전 행을 잠근다
        Campaign campaign = campaignRepository.findForUpdate(campaignId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        CampaignTerm term = campaignTermRepository.findByCampaignIdAndMerchantId(campaignId, merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN)); // 참여하지 않는 기획전

        if (campaign.getStatus() != CampaignStatus.PREPARING) {
            throw new BusinessException(ErrorCode.TERMS_LOCKED);
        }
        long value = request.value();
        long minOrder = request.minOrder();
        long cap = request.cap();
        if (value <= 0) {
            throw new BusinessException(ErrorCode.INVALID, "할인 금액을 입력해 주세요.");
        }
        if (minOrder < value) {
            throw new BusinessException(ErrorCode.INVALID, "최소 주문 금액은 할인 금액보다 작게 입력할 수 없어요.");
        }
        if (cap < value) {
            throw new BusinessException(ErrorCode.INVALID, "할인 한도는 할인 금액보다 커야 해요.");
        }

        boolean register = Boolean.TRUE.equals(request.register());
        term.update(value, minOrder, request.validity(), cap, register);
        campaignTermRepository.flush();

        if (register) {
            String txHash = ChainCall.run(() -> chainClient.registerTerms(
                    campaignId, merchantId, value, minOrder, request.validity().name(), cap));
            ledgerService.record(LedgerType.ADMIN,
                    merchant.getName() + " 쿠폰 조건 등록 · " + MerchantLook.won(value) + " · "
                            + MerchantLook.won(minOrder) + " 이상",
                    merchant.getName(), merchantId, null, campaignId, null, null, null, null, txHash);
        }

        CampaignResponse response = assembler.assembleWithHistory(List.of(campaign)).get(0);
        return withMine(response, merchantId);
    }

    /** 응답의 terms 중 내 가게 조건을 mine으로 붙인다 */
    private CampaignResponse withMine(CampaignResponse response, Long merchantId) {
        TermView mine = response.terms().stream()
                .filter(t -> merchantId.equals(t.merchantId())).findFirst().orElse(null);
        return response.withMine(mine);
    }
}