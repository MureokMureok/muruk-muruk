package com.murukmuruk.domain.campaign.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.murukmuruk.domain.campaign.enums.CampaignStatus;
import com.murukmuruk.domain.campaign.enums.TermValidity;
import com.murukmuruk.domain.ledger.dto.LedgerRowResponse;

import java.util.List;

/**
 * 기획전 한 개 (프론트 campaignView와 같은 이름·모양).
 * 쓰이는 곳에 따라 product(상품), flow(손님 흐름), history(조건 변경 이력), mine(우리 가게 조건)이 붙는다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CampaignResponse(
        Long id,
        String title,
        String startDate,
        String endDate,
        CampaignStatus status,
        List<TermView> terms,
        TermView mine,                    // 가게 화면: 내 가게 조건
        List<FlowRow> flow,               // 관리자 화면: 가게 간 손님 흐름
        List<LedgerRowResponse> history   // 가게 화면: 조건 변경 이력
) {

    /** 참여 가게 한 곳의 쿠폰 조건 + 숫자 */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TermView(
            Long merchantId,
            String merchantName,
            String merchantShort,
            String merchantColor,
            String merchantCategory,
            long value,              // 1장당 할인 금액
            long minOrder,           // 최소 주문 금액
            TermValidity validity,
            long cap,                // 할인 한도
            boolean registered,      // "기획전에 등록하기"를 눌렀는지
            long issued,             // 발급된 쿠폰 수 (구매 취소로 사라진 것은 뺀다)
            long used,               // 사용 완료된 쿠폰 수
            long burden,             // 할인 부담 = 사용 완료 수 × 할인 금액
            long qtyTotal,           // 최대 발급 수 = 한도 ÷ 할인 금액
            long qtyLeft,            // 남은 발급 수
            ProductView product      // 기획전 목록(GET /api/campaigns)에서만
    ) {
        public TermView withProduct(ProductView product) {
            return new TermView(merchantId, merchantName, merchantShort, merchantColor, merchantCategory,
                    value, minOrder, validity, cap, registered, issued, used, burden, qtyTotal, qtyLeft, product);
        }
    }

    /** 시연용 상품 (이름, 가격) */
    public record ProductView(String name, long price) {
    }

    /** 손님 흐름 한 줄: 이 가게(from)에서 산 손님이 다른 가게에서 쿠폰을 쓴 수. cells는 참여 가게 순서와 같고, 자기 자신 칸은 null */
    public record FlowRow(Long merchantId, String name, List<Long> cells) {
    }

    public CampaignResponse withMine(TermView mine) {
        return new CampaignResponse(id, title, startDate, endDate, status, terms, mine, flow, history);
    }

    public CampaignResponse withFlow(List<FlowRow> flow) {
        return new CampaignResponse(id, title, startDate, endDate, status, terms, mine, flow, history);
    }

    public CampaignResponse withHistory(List<LedgerRowResponse> history) {
        return new CampaignResponse(id, title, startDate, endDate, status, terms, mine, flow, history);
    }

    public CampaignResponse withTerms(List<TermView> terms) {
        return new CampaignResponse(id, title, startDate, endDate, status, terms, mine, flow, history);
    }
}