// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMurukCoupon — 무럭무럭 연합 기획전 쿠폰 (ERC-1155, 양도 불가)
/// @notice 인터페이스 v3 (11/3 팀 확정 + 11/4 사용자 결정: 락업 2종 · 주문당 쿠폰 1장 · 기획전 가게 수 상한).
///         동작 기준은 프론트 모의 API(feature/frontend 브랜치 frontend/src/api/core.js · api.js, 11/3)와
///         Figma 와이어프레임(소비자 · 가맹점 센터 M1~M4 · KCP 관리자 K1~K3), KCP 미팅 "락업"(10/30), 공동구매 설계안 슬라이드(11/4).
///         - 예치금·충전금 없음: 가게는 "할인 한도(상한)"만 정한다. 최대 발급 수 = 할인 한도 ÷ 할인 금액
///         - 쿠폰은 정액권만. 가맹점 직접 발행(첫 구매 보너스 등)은 이번 범위 밖
///         - 발급 락업: 구매하면 "확정 대기"로 발급 → 구매 확정 시 사용 가능 / 구매 취소 시 무효
///         - 사용 락업: 결제 시작 시 "결제 중"으로 잠금 → 결제 확정 시 소각 / 결제 취소 시 복원
///         - 모든 사용자는 소셜 로그인 → 백엔드 서버 지갑이 대신 호출한다
///         ADMIN = KCP 관리자 기능, OPERATOR = 백엔드(가맹점·소비자 요청 대행).
///         금액 단위는 원(KRW) 정수, 시각은 unix seconds.
/// @dev tokenId 하나 = 쿠폰 한 장 (발행량 1, 1부터 증가). 가맹점은 merchantId(번호)로 구분한다 (K1: 지갑 주소 받지 않음).
interface IMurukCoupon {
    // ───────────── 타입 ─────────────

    /// @notice 가맹점 심사 상태 (모의 API merchant.status). 신청(APPLIED)은 체인 밖 — 체인에는 심사 결과만 남긴다.
    enum MerchantStatus {
        None,     // 심사 전
        Approved, // 승인 → 기획전 참여·쿠폰 조건 등록 가능
        Rejected  // 반려
    }

    /// @notice 기획전 상태 (모의 API campaign.status)
    enum CampaignStatus {
        None,      // 없음
        Preparing, // 준비 중 — 참여 가게들이 쿠폰 조건 등록
        Active,    // 진행 중 — 구매하면 쿠폰 발급
        Paused,    // 일시 중지 — 새 발급만 멈춤, 받은 쿠폰은 유효기간까지 사용 가능
        Ended      // 종료 — 직접 종료했거나 종료 시각이 지남 (조회 시 계산)
    }

    /// @notice 쿠폰 유효기간 방식 (모의 API term.validity, Figma M2)
    enum Validity {
        Days30,     // 받은 날(발급일)부터 30일 (마지막 날 23:59:59 KST까지)
        CampaignEnd // 기획전 종료 시각까지
    }

    /// @notice 쿠폰에 저장되는 상태
    enum CouponState {
        None,
        Pending,   // 확정 대기 — 구매 확정 전 (발급 락업)
        Available, // 사용 가능
        Locked,    // 결제 중 — 결제 확정 전 (사용 락업)
        Used,      // 사용 완료 (소각)
        Voided     // 무효 — 구매 취소로 회수 (소각)
    }

    /// @notice 화면용 쿠폰 상태 (statusOf). Expired는 저장값이 아니라 조회 시 계산한다.
    enum Status {
        None,      // 없는 쿠폰
        Pending,   // 확정 대기
        Available, // 사용 가능
        InUse,     // 결제 중
        Used,      // 사용 완료
        Expired,   // 유효기간 지남
        Voided     // 무효 (구매 취소)
    }

    /// @notice 사용 검증 실패 사유. 1~5는 모의 API USE_CHECKS · 화면 ⑨-c "쿠폰 확인 결과" 5항목, 6~8은 락업 상태.
    ///         검사 순서: NotOwner → WrongMerchant → Voided → NotConfirmed → Expired → BelowMinOrder → AlreadyUsed → InUse
    enum Reason {
        Ok,
        NotOwner,      // 내 쿠폰인가 (없는 쿠폰 포함)       NOT_OWNER
        WrongMerchant, // 쓸 수 있는 가게인가                 WRONG_MERCHANT
        Expired,       // 유효기간 안인가                     EXPIRED
        BelowMinOrder, // 최소 주문 금액                      MIN_ORDER_NOT_MET
        AlreadyUsed,   // 아직 안 쓴 쿠폰인가                 COUPON_ALREADY_USED
        NotConfirmed,  // 구매 확정 전 쿠폰 (발급 락업)
        InUse,         // 다른 결제에 사용 중 (사용 락업)
        Voided         // 구매 취소로 무효가 된 쿠폰
    }

    /// @notice 발급 주문(쿠폰을 받게 한 구매) 상태
    enum OrderStatus {
        None,
        Pending,   // 구매 확정 대기 — 받은 쿠폰은 확정 대기
        Confirmed, // 구매 확정 — 쿠폰 사용 가능
        Cancelled  // 구매 취소 — 쿠폰 무효
    }

    /// @notice 쿠폰 결제(사용) 상태
    enum PaymentStatus {
        None,
        Locked,    // 결제 중 — 쿠폰 잠김
        Confirmed, // 결제 확정 — 쿠폰 소각
        Cancelled  // 결제 취소 — 쿠폰 복원
    }

    /// @notice 기획전에서 가게 한 곳의 쿠폰 조건과 집계 (모의 API campaign.terms[] + termStats)
    struct Term {
        uint256 amount;      // 할인 금액 (value)
        uint256 minOrder;    // 최소 주문 금액
        uint256 cap;         // 할인 한도 (상한)
        uint256 maxIssue;    // 최대 발급 수 = cap ÷ amount (등록 때 계산)
        Validity validity;
        bool registered;     // 기획전에 등록했는지
        uint256 issuedCount; // 발급된 수 (구매 취소로 무효가 되면 다시 줄어듦)
        uint256 usedCount;   // 사용된 수
        uint256 burden;      // 할인 부담 = 실제로 쓰인 할인액 합계 (M4)
    }

    struct Coupon {
        uint256 campaignId;
        uint256 merchantId;     // 사용처 = 할인 부담 가게
        uint256 fromMerchantId; // 쿠폰을 받게 한 구매 가게 ("어디서 온 손님", M4)
        uint256 amount;
        uint256 minOrder;
        bytes32 orderRef;       // 쿠폰을 받게 한 주문
        uint64 issuedAt;
        uint64 expiresAt;       // 발급 때 정해짐 (확정 대기 중에도 유효기간은 흐른다)
        uint64 usedAt;
        CouponState state;
        uint256 discount;       // 사용 때 실제 할인액
    }

    struct Order {
        OrderStatus status;
        uint256 campaignId;
        address buyer;
    }

    struct Payment {
        PaymentStatus status;
        uint256 tokenId;
        uint256 merchantId;
        uint256 orderAmount;
    }

    // ───────────── 이벤트 (기록 조회 K3 · 발급·사용 기록 ⑫ · 할인 부담 M4의 원본) ─────────────

    event MerchantReviewed(uint256 indexed merchantId, bool approved);

    event CampaignCreated(uint256 indexed campaignId, uint256[] merchantIds, uint64 startsAt, uint64 endsAt);
    /// @notice 쿠폰 조건 등록 (준비 중에 다시 등록하면 덮어쓰고 이벤트가 또 남는다 → "조건 변경 이력")
    event TermsRegistered(
        uint256 indexed campaignId,
        uint256 indexed merchantId,
        uint256 amount,
        uint256 minOrder,
        Validity validity,
        uint256 cap,
        uint256 maxIssue
    );
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus from, CampaignStatus to);

    /// @notice 쿠폰 발급 (확정 대기 상태로)
    event CouponIssued(
        uint256 indexed tokenId,
        uint256 indexed merchantId,
        address indexed to,
        uint256 campaignId,
        uint256 fromMerchantId,
        bytes32 orderRef,
        uint64 expiresAt
    );
    /// @notice 그 가게 할인 한도까지 다 발급돼서 쿠폰을 못 줬을 때 (④-c "쿠폰이 모두 소진됐어요")
    event IssueSkipped(bytes32 indexed orderRef, uint256 indexed merchantId);
    /// @notice 구매 확정 → 그 주문의 쿠폰이 사용 가능해짐 (쿠폰마다 CouponActivated)
    event PurchaseConfirmed(bytes32 indexed orderRef, uint256 count);
    event CouponActivated(uint256 indexed tokenId, uint64 expiresAt);
    /// @notice 구매 취소 → 그 주문의 쿠폰이 무효 (쿠폰마다 CouponVoided)
    event PurchaseCancelled(bytes32 indexed orderRef, uint256 count);
    event CouponVoided(uint256 indexed tokenId);

    /// @notice 결제 시작 → 쿠폰 잠금 (사용 락업)
    event CouponLocked(
        uint256 indexed tokenId,
        uint256 indexed merchantId,
        address indexed owner,
        uint256 orderAmount,
        bytes32 payRef
    );
    /// @notice 결제 취소 → 쿠폰 복원
    event CouponUnlocked(uint256 indexed tokenId, bytes32 indexed payRef);
    /// @notice 결제 확정 → 소각. 할인 부담은 merchantId별 discount 합계, "쿠폰으로 생긴 매출"은 orderAmount 합계 (M4),
    ///         가게 간 손님 흐름은 fromMerchantId → merchantId 건수 (K2 · M1 "우리에게 온 손님")
    event CouponRedeemed(
        uint256 indexed tokenId,
        uint256 indexed merchantId,
        address indexed owner,
        uint256 fromMerchantId,
        uint256 discount,
        uint256 orderAmount,
        bytes32 payRef
    );
    /// @notice 사용 거절도 체인에 남긴다 (⑨-c 재사용 거절, ⑫ "재사용 시도 · 거절"). 쿠폰 상태는 그대로.
    ///         merchantId = 사용을 시도한 가게 (M1 "최근 기록"에 그 가게 기준으로 보여줌)
    event RedeemRejected(uint256 indexed tokenId, address indexed owner, uint256 indexed merchantId, Reason reason, bytes32 payRef);

    // ───────────── 에러 (모의 API ApiError code와 대응) ─────────────

    error NotPending(uint256 merchantId);                        // NOT_PENDING — 이미 심사한 가게
    error NotApproved(uint256 merchantId);                       // 승인되지 않은 가게
    error InvalidCampaign();                                     // INVALID — 기간·참여 가게(2곳 이상)·번호
    error TooManyMerchants(uint256 max);                         // 기획전 참여 가게 수 상한
    error CampaignExists(uint256 campaignId);
    error CampaignNotFound(uint256 campaignId);
    error NotInCampaign(uint256 campaignId, uint256 merchantId);
    error TermsLocked(uint256 campaignId);                       // LOCKED — 준비 중이 아니면 조건 변경 불가
    error InvalidTerms();                                        // INVALID — 할인 금액·최소 주문·할인 한도
    error InvalidStatus(uint256 campaignId);                     // INVALID_STATUS — 지금 상태에서 못 바꿈 (종료 시각 지남 포함)
    error NotReady(uint256 campaignId);                          // NOT_READY — 조건 미등록 가게가 있음
    error OrderAlreadyIssued(bytes32 orderRef);
    error OrderNotPending(bytes32 orderRef);                     // 구매 확정·취소는 확정 대기 주문에서만
    error PaymentExists(bytes32 payRef);                         // 한 결제에 쿠폰은 1장만
    error PaymentNotLocked(bytes32 payRef);                      // 결제 확정·취소는 결제 중일 때만
    error TransferDisabled();
    error InvalidAddress();                                      // 지갑 주소 0
    error InvalidRef();                                          // orderRef·payRef 0

    // ───────────── KCP 관리자 (ADMIN) ─────────────

    /// @notice 가맹점 심사 — 승인/반려 (K1, 모의 API reviewMerchant). 심사 전 가게만.
    function reviewMerchant(uint256 merchantId, bool approve) external;

    /// @notice 연합 기획전 만들기 (K2, 모의 API createCampaign). 승인된 가게 2~20곳, 종료 ≥ 시작. 상태는 Preparing.
    ///         기획전 이름은 체인에 올리지 않는다 (백엔드 DB).
    /// @param endsAt 종료일 23:59:59 같은 "마지막으로 발급할 수 있는 시각"
    function createCampaign(uint256 campaignId, uint256[] calldata merchantIds, uint64 startsAt, uint64 endsAt) external;

    /// @notice 시작 승인(Active) / 일시 중지(Paused) / 다시 진행(Active) / 종료(Ended) (K2, 모의 API setCampaignStatus)
    ///         Preparing → Active (참여 가게 조건이 모두 등록돼야), Active → Paused·Ended, Paused → Active·Ended.
    ///         종료 시각이 지난 뒤에는 어떤 전환도 할 수 없다 (이미 자동 종료). 시작은 KCP 승인으로 하고 startsAt은 기록용.
    function setCampaignStatus(uint256 campaignId, CampaignStatus next) external;

    // ───────────── 백엔드 (OPERATOR) — 가맹점 요청 대행 ─────────────

    /// @notice 가게 쿠폰 조건 등록 (M2 "기획전에 등록하기", 모의 API saveTerms register=true).
    ///         준비 중일 때만, 다시 등록하면 덮어쓴다. 할인 금액 > 0, 최소 주문 ≥ 할인 금액, 할인 한도 ≥ 할인 금액.
    function registerTerms(
        uint256 campaignId,
        uint256 merchantId,
        uint256 amount,
        uint256 minOrder,
        Validity validity,
        uint256 cap
    ) external;

    // ───────────── 백엔드 (OPERATOR) — 소비자 요청 대행: 발급 (발급 락업) ─────────────

    /// @notice 구매 완료 시 쿠폰 발급 (모의 API purchase · couponsForPurchase). 쿠폰은 **확정 대기**로 나간다.
    ///         기획전이 진행 중(종료 시각 전)이고 구매 가게가 참여 중이면, 나머지 참여 가게 쿠폰을 1장씩.
    ///         그 가게 발급 수가 최대 발급 수에 닿았으면 건너뛰고 IssueSkipped (그 가게만 멈추고 기획전은 계속).
    /// @dev 같은 orderRef로 두 번 부르면 OrderAlreadyIssued (새로고침·재요청 방지). 쿠폰이 안 나가는 주문도 기록된다.
    function issueForPurchase(uint256 campaignId, uint256 buyMerchantId, address to, bytes32 orderRef)
        external
        returns (uint256[] memory tokenIds);

    /// @notice 구매 확정 → 그 주문의 쿠폰을 사용 가능으로 (유효기간은 발급 때 정한 그대로)
    function confirmPurchase(bytes32 orderRef) external;

    /// @notice 구매 확정 전 취소·환불 → 그 주문의 쿠폰을 무효로 (소각, 그 가게 발급 수를 되돌림)
    function cancelPurchase(bytes32 orderRef) external;

    // ───────────── 백엔드 (OPERATOR) — 소비자 요청 대행: 사용 (사용 락업) ─────────────

    /// @notice 결제 시작 → 쿠폰 잠금. 사용 검사를 통과해야 잠기고, 한 결제(payRef)에는 쿠폰 1장만 잠글 수 있다.
    /// @dev 검사 실패 시 되돌리지 않고 RedeemRejected를 남긴 뒤 (false, reason)을 반환한다. 쿠폰 상태는 바뀌지 않는다.
    ///      이미 쿠폰이 잠겼거나 확정된 payRef면 PaymentExists로 되돌린다 (결제 취소된 payRef는 다시 쓸 수 있음).
    function lockForPayment(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount, bytes32 payRef)
        external
        returns (bool ok, Reason reason);

    /// @notice 결제 확정 → 쿠폰 소각, 할인 부담에 더함. 잠긴 뒤 유효기간이 지나도 확정할 수 있다.
    function confirmPayment(bytes32 payRef) external returns (uint256 discount);

    /// @notice 결제 취소 → 쿠폰을 사용 가능으로 되돌림 (⑨-d "쿠폰은 그대로 남아 있어요")
    function cancelPayment(bytes32 payRef) external;

    // ───────────── 조회 (누구나) ─────────────

    /// @notice lockForPayment와 같은 검사를 상태 변경 없이 수행 (⑦ '사용하기' 활성, ⑧ 적용 가능 여부)
    function check(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount) external view returns (Reason);

    /// @notice ⑨-c "쿠폰 확인 결과" 5항목. unused는 '지금 사용 가능 상태인가'(확정 대기·결제 중·사용 완료·무효면 false)
    function checkAll(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount)
        external
        view
        returns (bool isOwner, bool merchantOk, bool inPeriod, bool minOrderOk, bool unused);

    function statusOf(uint256 tokenId) external view returns (Status);
    function couponOf(uint256 tokenId) external view returns (Coupon memory);
    /// @notice 사용(소각)·무효 뒤에도 원래 주인을 돌려준다 (⑫ 기록 화면)
    function ownerOfCoupon(uint256 tokenId) external view returns (address);

    function merchantOf(uint256 merchantId) external view returns (MerchantStatus);
    /// @notice status는 종료 시각이 지났으면 Ended로 계산해서 돌려준다
    function campaignOf(uint256 campaignId)
        external
        view
        returns (CampaignStatus status, uint256[] memory merchantIds, uint64 startsAt, uint64 endsAt);
    /// @notice 가게 조건 + 발급·사용 수·할인 부담 (M1·M3·M4, 소비자 ② "남은 수량")
    function termOf(uint256 campaignId, uint256 merchantId) external view returns (Term memory);
    /// @notice 이 주문으로 발급된 쿠폰 (④-b "발급 확인 중" 상태 조회)
    function issuedFor(bytes32 orderRef) external view returns (uint256[] memory);
    function orderOf(bytes32 orderRef) external view returns (Order memory);
    function paymentOf(bytes32 payRef) external view returns (Payment memory);
}
