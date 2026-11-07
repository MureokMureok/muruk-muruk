package com.murukmuruk.domain.settlement.service;

import com.murukmuruk.domain.coupon.enums.CouponType;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.order.enums.OrderStatus;
import com.murukmuruk.domain.settlement.dto.SettlementItem;
import com.murukmuruk.domain.settlement.dto.SettlementListResponse;
import com.murukmuruk.domain.settlement.dto.SettlementRow;
import com.murukmuruk.domain.settlement.dto.SettlementSummary;
import com.murukmuruk.domain.settlement.repository.SettlementRepository;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SettlementService {

    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 50;

    private final MerchantRepository merchantRepository;
    private final SettlementRepository settlementRepository;

    /** 우리 가게의 쿠폰 사용 내역 + 할인 금액 합계 (커서 방식) */
    @Transactional(readOnly = true)
    public SettlementListResponse getSettlements(Long merchantId, Long cursor, Integer size) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (merchant.getStatus() == MerchantStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 일시 정지된 가맹점
        }

        int pageSize = size == null ? DEFAULT_SIZE : size;
        if (pageSize < 1 || pageSize > MAX_SIZE) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        if (cursor != null && cursor < 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        long cursorId = cursor == null ? Long.MAX_VALUE : cursor;

        // 다음 페이지가 있는지 알기 위해 1개 더 가져온다
        List<SettlementRow> rows = settlementRepository.findSettlements(
                merchantId, OrderStatus.PAID, cursorId, PageRequest.of(0, pageSize + 1));
        boolean hasNext = rows.size() > pageSize;
        List<SettlementRow> page = hasNext ? rows.subList(0, pageSize) : rows;

        List<SettlementItem> items = page.stream().map(this::toItem).toList();
        Long nextCursor = hasNext ? page.get(page.size() - 1).orderId() : null;

        SettlementSummary summary = new SettlementSummary(
                settlementRepository.sumDiscountExcludingReceiveType(merchantId, OrderStatus.PAID, ReceiveType.CAMPAIGN),
                settlementRepository.sumDiscountByReceiveType(merchantId, OrderStatus.PAID, ReceiveType.CAMPAIGN));

        return new SettlementListResponse(summary, items, nextCursor, hasNext);
    }

    private SettlementItem toItem(SettlementRow row) {
        CouponType type = row.receiveType() == ReceiveType.CAMPAIGN ? CouponType.CAMPAIGN : CouponType.GENERAL;
        // 사용 시각은 명세 형식(초 단위)에 맞춰 소수점 이하를 자른다
        return new SettlementItem(row.orderId(), row.usedAt().truncatedTo(ChronoUnit.SECONDS),
                row.couponName(), type, maskName(row.customerName()), row.discountAmount());
    }

    /** 첫 글자만 남기고 나머지는 *로 가린다 (지민 -> 지*, 홍길동 -> 홍**). 한 글자 이름도 * 하나를 붙인다. */
    private String maskName(String name) {
        if (name == null || name.isBlank()) {
            return "*";
        }
        return name.charAt(0) + "*".repeat(Math.max(name.length() - 1, 1));
    }
}