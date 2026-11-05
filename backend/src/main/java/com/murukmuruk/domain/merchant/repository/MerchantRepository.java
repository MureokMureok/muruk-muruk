package com.murukmuruk.domain.merchant.repository;

import com.murukmuruk.domain.merchant.entity.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MerchantRepository extends JpaRepository<Merchant, Long> {

    // 로그인: 구글 고유 ID로 가맹점 찾기
    Optional<Merchant> findByGoogleSub(String googleSub);

    // 가입 신청 중복 확인
    boolean existsByGoogleSub(String googleSub);

    boolean existsByBusinessNo(String businessNo);
}