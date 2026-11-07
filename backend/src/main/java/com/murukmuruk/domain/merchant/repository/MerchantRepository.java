package com.murukmuruk.domain.merchant.repository;

import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MerchantRepository extends JpaRepository<Merchant, Long> {

    // 로그인: 구글 고유 ID로 가맹점 찾기
    Optional<Merchant> findByGoogleSub(String googleSub);

    // 가입 신청 중복 확인
    boolean existsByGoogleSub(String googleSub);

    boolean existsByBusinessNo(String businessNo);

    // 관리자 가맹점 목록 (최신 신청이 위)
    List<Merchant> findAllByOrderByIdDesc();

    List<Merchant> findByStatusOrderByIdDesc(MerchantStatus status);

    /**
     * 가맹점 행을 잠그고 조회한다 (SELECT ... FOR UPDATE).
     * 관리자 두 명이 같은 가맹점을 동시에 승인·반려해도 한쪽씩 처리되게 한다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Merchant m where m.id = :id")
    Optional<Merchant> findForUpdate(@Param("id") Long id);
}