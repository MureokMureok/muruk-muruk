package com.murukmuruk.domain.admin.service;

import com.murukmuruk.domain.admin.dto.MerchantStatusChangeResponse;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.global.chain.ChainClient;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminMerchantService {

    private final MerchantRepository merchantRepository;
    private final ChainClient chainClient;

    /**
     * 가맹점 상태 변경. 허용: APPLIED→ACTIVE(승인), APPLIED→REJECTED(반려), ACTIVE→SUSPENDED(정지), SUSPENDED→ACTIVE(해제)
     * 승인은 체인 등록을 먼저 하고, 성공했을 때만 DB 상태를 바꾼다 (체인 실패 시 APPLIED 그대로, CHAIN500).
     */
    @Transactional
    public MerchantStatusChangeResponse changeStatus(Long merchantId, MerchantStatus target) {
        // 1. APPLIED로 되돌리는 요청은 받지 않는다 → 400
        if (target == MerchantStatus.APPLIED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "변경할 수 있는 상태는 ACTIVE, SUSPENDED, REJECTED입니다.");
        }

        // 2. 가맹점 조회 → 없으면 404
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "존재하지 않는 가맹점입니다."));

        MerchantStatus current = merchant.getStatus();
        if (current == target) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 " + target + " 상태입니다.");
        }

        String txHash = null;
        if (target == MerchantStatus.REJECTED) {
            // 반려: 체인에는 아무것도 하지 않는다. 신청 대기(APPLIED)일 때만 가능하고 아니면 409
            merchant.reject();
        } else if (target == MerchantStatus.ACTIVE) {
            if (current == MerchantStatus.APPLIED) {
                // 승인: 체인 화이트리스트 등록이 먼저. 여기서 실패하면 아래 approve()까지 가지 않는다
                txHash = registerOnChain(merchant.getWalletAddress());
                merchant.approve();
            } else {
                // 해제: SUSPENDED → ACTIVE (DB만 변경)
                merchant.unsuspend();
            }
        } else {
            // 정지: ACTIVE → SUSPENDED만 허용. 승인 전(APPLIED) 가맹점은 정지할 수 없다
            if (current == MerchantStatus.APPLIED) {
                throw new BusinessException(ErrorCode.CONFLICT, "승인 전 가맹점은 정지할 수 없습니다.");
            }
            merchant.suspend();
        }

        // updatedAt은 DB에 반영(flush)될 때 채워지므로, 응답 전에 먼저 반영한다
        merchantRepository.flush();
        return MerchantStatusChangeResponse.of(merchant, txHash);
    }

    /** 체인 등록. ChainClient가 던진 예외가 아니어도 실패는 전부 CHAIN500으로 맞춘다 */
    private String registerOnChain(String walletAddress) {
        try {
            return chainClient.registerMerchant(walletAddress);
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.CHAIN_ERROR, "가맹점 체인 등록에 실패했습니다.", e);
        }
    }
}