package com.murukmuruk.domain.campaign.repository;

import com.murukmuruk.domain.campaign.entity.CampaignTerm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CampaignTermRepository extends JpaRepository<CampaignTerm, Long> {

    List<CampaignTerm> findByCampaignId(Long campaignId);

    List<CampaignTerm> findByCampaignIdIn(Collection<Long> campaignIds);

    /** 이 가게가 참여하는 모든 기획전의 조건 */
    List<CampaignTerm> findByMerchantId(Long merchantId);

    Optional<CampaignTerm> findByCampaignIdAndMerchantId(Long campaignId, Long merchantId);
}