package com.murukmuruk.domain.ledger.service;

import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import com.murukmuruk.domain.campaign.repository.CampaignRepository;
import com.murukmuruk.domain.ledger.dto.LedgerResponse;
import com.murukmuruk.domain.ledger.dto.LedgerRowResponse;
import com.murukmuruk.domain.ledger.enums.LedgerType;
import com.murukmuruk.domain.ledger.repository.LedgerRepository;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** KCP 관리자: 기록 전체 + 오늘 숫자 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LedgerQueryService {

    private static final int MAX_ROWS = 200; // 최신 기록부터 이만큼만 내려준다

    private final LedgerRepository ledgerRepository;
    private final MerchantRepository merchantRepository;
    private final CampaignRepository campaignRepository;

    public LedgerResponse getLedger() {
        LocalDateTime from = LocalDate.now().atStartOfDay();
        LocalDateTime to = from.plusDays(1);

        long issuedToday = ledgerRepository.countByTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                LedgerType.ISSUE, from, to);
        long usedToday = ledgerRepository.countByTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                LedgerType.USE, from, to);
        long rejected = ledgerRepository.countByType(LedgerType.REJECT);
        long merchants = merchantRepository.findByStatusOrderByIdDesc(MerchantStatus.ACTIVE).size();
        long activeCampaigns = campaignRepository.findByStatusOrderByIdAsc(CampaignStatus.ACTIVE).size();

        List<LedgerRowResponse> rows = ledgerRepository.findAllByOrderByIdDesc(PageRequest.of(0, MAX_ROWS))
                .stream().map(LedgerRowResponse::from).toList();
        return new LedgerResponse(
                new LedgerResponse.Stats(issuedToday, usedToday, rejected, merchants, activeCampaigns), rows);
    }
}