package com.murukmuruk.domain.dashboard.service;

import com.murukmuruk.domain.coupon.repository.MerchantLimitRepository;
import com.murukmuruk.domain.dashboard.dto.DashboardResponse;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MerchantLimitRepository merchantLimitRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long merchantId) {
        Merchant merchant = merchantLimitRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        // 일시 정지된 가맹점은 모든 API 접근 불가 (신청 상태는 조회 가능)
        if (merchant.isSuspended()) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return new DashboardResponse(
                merchant.getId(), merchant.getName(), merchant.getCategory(), merchant.getStatus(),
                merchant.getWalletAddress(), merchant.getIssueLimit(), merchant.getIssuedAmount(),
                merchant.getRemainingLimit(), 0L);
    }
}