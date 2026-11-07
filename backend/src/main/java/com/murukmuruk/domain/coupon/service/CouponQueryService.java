package com.murukmuruk.domain.coupon.service;

import com.murukmuruk.domain.coupon.dto.CouponDetailResponse;
import com.murukmuruk.domain.coupon.dto.CouponItem;
import com.murukmuruk.domain.coupon.dto.CouponListResponse;
import com.murukmuruk.domain.coupon.dto.CouponRow;
import com.murukmuruk.domain.coupon.entity.Coupon;
import com.murukmuruk.domain.coupon.entity.CouponPolicy;
import com.murukmuruk.domain.coupon.enums.CouponState;
import com.murukmuruk.domain.coupon.enums.CouponStatus;
import com.murukmuruk.domain.coupon.repository.CouponPolicyRepository;
import com.murukmuruk.domain.coupon.repository.CouponRepository;
import com.murukmuruk.domain.merchant.entity.Merchant;
import com.murukmuruk.domain.merchant.repository.MerchantRepository;
import com.murukmuruk.domain.user.entity.User;
import com.murukmuruk.domain.user.repository.UserRepository;
import com.murukmuruk.global.exception.BusinessException;
import com.murukmuruk.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CouponQueryService {

    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 50;
    // 시각 범위 조건에서 "제한 없음"을 뜻하는 값 (MySQL DATETIME 범위 안)
    private static final LocalDateTime MIN_TIME = LocalDateTime.of(1000, 1, 1, 0, 0, 0);
    private static final LocalDateTime MAX_TIME = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    private final UserRepository userRepository;
    private final CouponRepository couponRepository;
    private final CouponPolicyRepository couponPolicyRepository;
    private final MerchantRepository merchantRepository;

    /** 내 쿠폰함 (커서 방식, 발급 최신순) */
    @Transactional(readOnly = true)
    public CouponListResponse getMyCoupons(Long userId, CouponStatus status, Long cursor, Integer size) {
        validateActiveUser(userId);

        int pageSize = size == null ? DEFAULT_SIZE : size;
        if (pageSize < 1 || pageSize > MAX_SIZE) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        if (cursor != null && cursor < 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        long cursorId = cursor == null ? Long.MAX_VALUE : cursor;

        // 상태 필터를 (DB 상태, 만료 시각 범위)로 바꾼다
        LocalDateTime now = LocalDateTime.now();
        List<CouponState> states;
        LocalDateTime lower = MIN_TIME;
        LocalDateTime upper = MAX_TIME;
        if (status == null) {
            states = List.of(CouponState.ACTIVE, CouponState.USED);
        } else if (status == CouponStatus.ISSUED) {
            states = List.of(CouponState.ACTIVE);
            lower = now;   // 만료 시각이 지금보다 뒤
        } else if (status == CouponStatus.EXPIRED) {
            states = List.of(CouponState.ACTIVE);
            upper = now;   // 만료 시각이 지금 이전
        } else {
            states = List.of(CouponState.USED);
        }

        // 다음 페이지가 있는지 알기 위해 1개 더 가져온다
        List<CouponRow> rows = couponRepository.findMine(
                userId, states, lower, upper, cursorId, PageRequest.of(0, pageSize + 1));

        boolean hasNext = rows.size() > pageSize;
        List<CouponRow> page = hasNext ? rows.subList(0, pageSize) : rows;

        List<CouponItem> items = page.stream().map(row -> CouponItem.of(row, now)).toList();
        Long nextCursor = hasNext ? page.get(page.size() - 1).couponId() : null;

        return new CouponListResponse(items, nextCursor, hasNext);
    }

    /** 쿠폰 상세. 내 쿠폰이 아니면 403 */
    @Transactional(readOnly = true)
    public CouponDetailResponse getCoupon(Long userId, Long couponId) {
        validateActiveUser(userId);

        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!coupon.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 남의 쿠폰
        }
        CouponPolicy policy = couponPolicyRepository.findById(coupon.getCouponPolicyId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Merchant merchant = merchantRepository.findById(policy.getMerchantId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        CouponStatus status = CouponStatus.of(coupon.getState(), coupon.getExpiresAt(), now);

        // 지금은 OWN_SHOP 쿠폰만 만들 수 있으므로 사용처는 발행한 가맹점 하나다
        // (CAMPAIGN_MERCHANTS는 기획전을 만들 때 참여 가게 전체로 확장)
        var usableMerchants = List.of(
                new CouponDetailResponse.UsableMerchant(merchant.getId(), merchant.getName()));

        return new CouponDetailResponse(
                coupon.getId(),
                policy.getName(),
                status,
                policy.getDiscountAmount(),
                policy.getMinOrderAmount(),
                coupon.getExpiresAt(),
                coupon.getCreatedAt(),
                coupon.getUsedAt(),
                coupon.getTokenId(),
                new CouponDetailResponse.MerchantInfo(merchant.getId(), merchant.getName(), merchant.getCategory()),
                policy.getUsableScope(),
                usableMerchants,
                null);
    }

    private void validateActiveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN); // 일시 정지된 계정
        }
    }
}