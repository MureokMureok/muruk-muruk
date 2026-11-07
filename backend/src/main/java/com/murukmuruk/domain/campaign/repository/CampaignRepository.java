package com.murukmuruk.domain.campaign.repository;

import com.murukmuruk.domain.campaign.entity.Campaign;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    /** 상태별 기획전 (id 오름차순) */
    List<Campaign> findByStatusOrderByIdAsc(CampaignStatus status);

    /** 전체 기획전 (id 오름차순) */
    List<Campaign> findAllByOrderByIdAsc();

    /**
     * 기획전 행을 잠그고 조회한다 (SELECT ... FOR UPDATE).
     * 관리자의 시작 승인과 가게의 조건 저장이 동시에 일어나도 한쪽씩 처리되게 한다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Campaign c where c.id = :id")
    Optional<Campaign> findForUpdate(@Param("id") Long id);
}