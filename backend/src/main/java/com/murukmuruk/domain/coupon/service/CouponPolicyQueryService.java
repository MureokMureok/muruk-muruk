package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponPolicyItem;
import com.murukmuruk.domain.coupon.dto.CouponPolicyListResponse;
import com.murukmuruk.domain.coupon.dto.CouponPolicyRow;
import com.murukmuruk.domain.coupon.enums.ReceiveType;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.merchant.enums.MerchantStatus;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CouponPolicyQueryService {

    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 50;

    private final UserRepository userRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final CouponRepository couponRepository;

    /** 지금 받을 수 있는 쿠폰 목록 (커서 방식, id 내림차순) */
    @Transactional(readOnly = true)
    public CouponPolicyListResponse getClaimable(Long userId, Long cursor, Integer size) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 일시 정지된 계정
        }

        int pageSize = size == null ? DEFAULT_SIZE : size;
        if (pageSize < 1 || pageSize > MAX_SIZE) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 잘못된 size
        }
        if (cursor != null && cursor < 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST); // 잘못된 cursor
        }
        long cursorId = cursor == null ? Long.MAX_VALUE : cursor;

        // 다음 페이지가 있는지 알기 위해 1개 더 가져온다
        List<CouponPolicyRow> rows = couponPolicyRepository.findClaimable(
                ReceiveType.DIRECT, MerchantStatus.ACTIVE, cursorId, PageRequest.of(0, pageSize + 1));

        boolean hasNext = rows.size() > pageSize;
        List<CouponPolicyRow> page = hasNext ? rows.subList(0, pageSize) : rows;

        // 이 페이지의 정책 중 내가 이미 받은 것
        Set<Long> claimedIds = new HashSet<>();
        if (!page.isEmpty()) {
            List<Long> ids = page.stream().map(CouponPolicyRow::couponPolicyId).toList();
            claimedIds.addAll(couponRepository.findClaimedPolicyIds(userId, ids));
        }

        List<CouponPolicyItem> items = page.stream()
                .map(row -> CouponPolicyItem.of(row, claimedIds.contains(row.couponPolicyId())))
                .toList();
        Long nextCursor = hasNext ? page.get(page.size() - 1).couponPolicyId() : null;

        return new CouponPolicyListResponse(items, nextCursor, hasNext);
    }
}