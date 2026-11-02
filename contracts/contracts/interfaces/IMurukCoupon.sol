// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMurukCoupon — 무럭무럭 연합 기획전 쿠폰 (ERC-1155, 양도 불가)
/// @notice 인터페이스 v1. 동작 기준은 프론트 모의 API(feature/frontend 브랜치 frontend/src/api/api.js, PR #1)와 docs/mvp-spec.md MVP 목록.
///         모든 사용자는 구글 로그인 → 백엔드 서버 지갑이 대신 호출한다.
///         ADMIN = KCP 관리자 기능, OPERATOR = 백엔드(가맹점·소비자 요청 대행).
///         금액 단위는 원(KRW) 정수, 시각은 unix seconds. 쿠폰은 정액권만.
/// @dev tokenId 하나 = 쿠폰 한 장 (발행량 1, 1부터 증가). 쿠폰마다 만료일·사용 여부가 달라서 묶지 않는다.
///      가맹점은 merchantId(번호)로 구분 — 지갑 주소 방식은 백엔드 확인 후 결정.
interface IMurukCoupon {
    // ───────────── 타입 ─────────────

    /// @notice 기획전 상태. 모의 API campaign.status와 같다.
    enum CampaignStatus {
        None,            // 없음
        Signing,         // 가맹점 서명 중
        PendingApproval, // 전원 서명 → 규칙 잠김, KCP 승인 대기
        Active,          // 승인됨 → 구매 시 쿠폰 발급
        Rejected,        // 반려됨 (서명한 가게 충전금은 한도로 반환)
        Cancelled        // KCP가 취소 (서명 중·승인 대기에서만, 충전금 반환)
    }

    /// @notice 쿠폰 출처
    enum CouponSource {
        Campaign, // 연합 기획전 쿠폰 (다른 가게에서 사면 받음)
        Issuance  // 가맹점 직접 발행 쿠폰 (그 가게에서 조건 충족 시 받음)
    }

    /// @notice 가맹점 직접 발행 쿠폰을 받는 조건 (모의 API issuance.receive)
    enum ReceiveRule {
        FirstPurchase, // 우리 가게 첫 구매 + receiveMin 이상
        MinAmount      // receiveMin 이상 구매
    }

    /// @notice 쿠폰 상태. Expired는 저장값이 아니라 조회 시 계산한다.
    enum Status {
        None,      // 없는 쿠폰
        Available, // 사용 가능
        Used,      // 사용 완료 (소각됨, 기록은 남음)
        Expired    // 유효기간 지남
    }

    /// @notice 사용 검증 실패 사유. 화면 ⑨-c "쿠폰 확인 결과" 5항목과 순서가 같다.
    enum Reason {
        Ok,
        NotOwner,      // 내 쿠폰인가 (없는 쿠폰 포함 — 모의 API와 같음)
        WrongMerchant, // 쓸 수 있는 가게인가
        Expired,       // 유효기간 안인가
        BelowMinOrder, // 최소 주문 금액
        AlreadyUsed    // 아직 안 쓴 쿠폰인가
    }

    /// @notice 가맹점. 남은 한도 = limit - reserved
    struct Merchant {
        bool whitelisted;
        uint256 limit;    // KCP가 등록한 발행 한도 (입금액 합계)
        uint256 reserved; // 기획전 충전금·직접 발행분으로 묶인 금액
    }

    /// @notice 기획전에서 가게 한 곳의 조건 (모의 API campaign.terms[])
    struct CampaignTerm {
        uint256 amount;       // 할인 금액
        uint256 minOrder;     // 최소 주문 금액
        uint256 fund;         // 충전금 (서명 때 한도에서 묶음)
        uint256 fundReserved; // 발급된 쿠폰 할인액만큼 미리 확보한 금액
        uint256 fundUsed;     // 실제 사용된 할인액 (정산 = 이 가게 부담)
        bool signed;
    }

    /// @notice 가맹점 직접 발행 쿠폰 묶음 (모의 API issuances[])
    struct Issuance {
        uint256 merchantId;
        uint256 amount;      // 할인 금액
        uint256 minOrder;    // 사용할 때 최소 주문 금액
        ReceiveRule receiveRule; // 받는 조건
        uint256 receiveMin;  // 받는 조건의 구매 금액 기준
        uint64 expiresAt;    // 발행 시점 + 유효일수 (묶음 전체 공통)
        uint32 qty;          // 발행 수량
        uint32 issuedCount;
        uint32 usedCount;
        uint256 usedAmount;  // 실제 사용된 할인액
    }

    struct Coupon {
        CouponSource source;
        uint256 campaignId;     // source == Campaign일 때
        uint256 issuanceId;     // source == Issuance일 때
        uint256 merchantId;     // 사용처 = 할인 부담 가게
        uint256 fromMerchantId; // 쿠폰을 받게 한 구매 가게
        uint256 amount;
        uint256 minOrder;
        uint64 issuedAt;
        uint64 expiresAt;
        bool used;
        uint64 usedAt;
    }

    // ───────────── 이벤트 (체인 기록 화면 · 발급·사용 기록 ⑫ · 정산의 원본) ─────────────

    event MerchantWhitelisted(uint256 indexed merchantId);
    event LimitAdded(uint256 indexed merchantId, uint256 amount, uint256 newLimit, bytes32 depositRef);

    event CampaignCreated(uint256 indexed campaignId, uint256[] merchantIds, uint32 validDays);
    event CampaignSigned(uint256 indexed campaignId, uint256 indexed merchantId, uint256 amount, uint256 minOrder, uint256 fund);
    /// @notice 참여 가게 전원 서명 → 규칙 잠금 (이후 누구도 조건을 바꿀 수 없음)
    event CampaignLocked(uint256 indexed campaignId);
    event CampaignDecided(uint256 indexed campaignId, bool approved);
    event CampaignCancelled(uint256 indexed campaignId);
    /// @notice 반려·취소된 기획전의 충전금을 가게 한도로 돌려줌
    event FundReleased(uint256 indexed campaignId, uint256 indexed merchantId, uint256 amount);

    event IssuanceCreated(uint256 indexed issuanceId, uint256 indexed merchantId, uint256 amount, uint32 qty, uint256 total);

    event CouponIssued(
        uint256 indexed tokenId,
        uint256 indexed merchantId,
        address indexed to,
        CouponSource source,
        uint256 fromMerchantId,
        bytes32 orderRef,
        uint64 expiresAt
    );
    /// @notice 충전금이 부족해 그 가게 기획전 쿠폰만 못 줬을 때 (④-c "2장 중 1장")
    event IssueSkipped(bytes32 indexed orderRef, uint256 indexed merchantId);

    /// @notice 사용 완료 → 소각. 정산은 이 이벤트의 discount를 merchantId별로 합산한다.
    event CouponRedeemed(uint256 indexed tokenId, uint256 indexed merchantId, address indexed owner, uint256 discount, bytes32 orderRef);
    /// @notice 사용 거절도 체인에 남긴다 (⑨-c 재사용 거절, ⑫ "재사용 시도 · 거절"). 쿠폰 상태는 그대로.
    event RedeemRejected(uint256 indexed tokenId, address indexed owner, Reason reason, bytes32 orderRef);

    // ───────────── 에러 (모의 API ApiError code와 대응) ─────────────

    error NotWhitelisted(uint256 merchantId);                                   // NOT_WHITELISTED
    error NoLimit(uint256 merchantId);                                          // NO_LIMIT
    error LimitExceeded(uint256 merchantId, uint256 requested, uint256 remaining); // LIMIT_EXCEEDED
    error CampaignExists(uint256 campaignId);
    error CampaignNotFound(uint256 campaignId);
    error NotInCampaign(uint256 campaignId, uint256 merchantId);
    error CampaignNotSigning(uint256 campaignId);                               // LOCKED
    error AlreadySigned(uint256 campaignId, uint256 merchantId);                // ALREADY_SIGNED
    error CampaignNotPending(uint256 campaignId);                               // NOT_PENDING
    error OrderAlreadyIssued(bytes32 orderRef);
    error InvalidAmount();
    error TransferDisabled();
    error InvalidAddress();                                                     // 지갑 주소 0
    error InvalidRef();                                                         // orderRef·requestRef 0
    error IssuanceAlreadyCreated(bytes32 requestRef);                           // 같은 발행 요청 재시도
    error TooManyIssuances(uint256 merchantId, uint256 max);                    // 진행 중 발행 묶음 상한
    error CampaignNotCancellable(uint256 campaignId);

    // ───────────── KCP 관리자 (ADMIN) ─────────────

    /// @notice 가맹점 확인 후 등록 (모의 API whitelistMerchant)
    function whitelistMerchant(uint256 merchantId) external;

    /// @notice 입금 확인된 금액만큼 발행 한도 추가 (모의 API registerLimit). 입금 자체는 체인 밖.
    /// @param depositRef 백엔드 입금 내역 ID의 해시 (기록 추적용)
    function addLimit(uint256 merchantId, uint256 amount, bytes32 depositRef) external;

    /// @notice 연합 기획전 생성. 참여 가게는 등록된 가맹점이어야 한다. 상태는 Signing으로 시작.
    /// @param validDays 기획전 쿠폰 유효기간 — 받은 날부터 며칠 (모의 API validDays = 30)
    function createCampaign(uint256 campaignId, uint256[] calldata merchantIds, uint32 validDays) external;

    /// @notice 승인(Active) 또는 반려(Rejected). PendingApproval 상태에서만. KCP는 규칙을 바꿀 수 없다.
    ///         반려하면 서명한 가게들의 충전금을 한도로 돌려준다 (FundReleased).
    function decideCampaign(uint256 campaignId, bool approve) external;

    /// @notice 서명이 멈췄거나 승인 전인 기획전 취소 (Signing·PendingApproval에서만). 충전금 반환.
    function cancelCampaign(uint256 campaignId) external;

    // ───────────── 백엔드 (OPERATOR) — 가맹점 요청 대행 ─────────────

    /// @notice 가맹점이 기획전 조건에 서명. 충전금을 남은 한도에서 묶는다.
    ///         참여 가게 전원이 서명하면 자동으로 PendingApproval(규칙 잠금)으로 바뀐다.
    function signCampaign(uint256 campaignId, uint256 merchantId, uint256 amount, uint256 minOrder, uint256 fund) external;

    /// @notice 가맹점 직접 발행 쿠폰 묶음 등록. amount × qty를 남은 한도에서 묶는다.
    ///         가게당 진행 중인 묶음은 최대 20개 (수량 소진·유효기간 지난 묶음은 자동으로 빠짐).
    /// @param requestRef 백엔드 발행 요청 ID의 해시. 같은 값으로 다시 부르면 IssuanceAlreadyCreated (재시도 방지)
    /// @return issuanceId 1부터 증가
    function createIssuance(
        uint256 merchantId,
        uint256 amount,
        uint256 minOrder,
        ReceiveRule receiveRule,
        uint256 receiveMin,
        uint32 validDays,
        uint32 qty,
        bytes32 requestRef
    ) external returns (uint256 issuanceId);

    // ───────────── 백엔드 (OPERATOR) — 소비자 요청 대행 ─────────────

    /// @notice 구매 완료 시 쿠폰 발급 (모의 API purchase).
    ///         1) 기획전 쿠폰: 기획전이 Active이고 구매 가게가 참여 중이면, 나머지 참여 가게 쿠폰 1장씩.
    ///            그 가게 충전금(fund - fundReserved)이 할인액보다 적으면 건너뛰고 IssueSkipped.
    ///         2) 보너스 쿠폰: 구매 가게의 직접 발행 묶음 중 받는 조건을 충족하고 수량이 남은 것.
    ///            수량이 다 떨어졌거나 유효기간이 지난 묶음은 진행 중 목록에서 빠진다.
    ///            첫 구매 여부는 컨트랙트가 기록한 구매 이력으로 판단한다.
    /// @dev 같은 orderRef로 두 번 부르면 OrderAlreadyIssued (새로고침·재요청 방지).
    ///      campaignId = 0이면 기획전 쿠폰은 건너뛴다. to = 0이면 InvalidAddress, orderRef = 0이면 InvalidRef.
    function issueForPurchase(uint256 campaignId, uint256 buyMerchantId, address to, uint256 orderAmount, bytes32 orderRef)
        external
        returns (uint256[] memory tokenIds);

    /// @notice 쿠폰 사용 (모의 API redeemCoupon). **백엔드는 결제 승인 후에 호출한다** (결제 실패 시 쿠폰 보호).
    ///         5가지 검사 통과 → 바로 소각하고 할인액을 충전금/발행분 사용액에 더한다.
    /// @dev 검사 실패 시 되돌리지 않고 RedeemRejected를 남긴 뒤 (false, reason, 0)을 반환한다.
    ///      그래야 "컨트랙트가 거절했다"는 기록이 체인에 남는다. 쿠폰 상태는 바뀌지 않는다.
    function redeem(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount, bytes32 orderRef)
        external
        returns (bool ok, Reason reason, uint256 discount);

    // ───────────── 조회 (누구나) ─────────────

    /// @notice redeem과 같은 검사를 상태 변경 없이 수행 (⑦ '사용하기' 활성, ⑧ 적용 가능 여부)
    function check(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount) external view returns (Reason);

    /// @notice 5가지 검사를 항목별로 반환 (⑨-c "쿠폰 확인 결과" 표시용)
    function checkAll(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount)
        external
        view
        returns (bool isOwner, bool merchantOk, bool inPeriod, bool minOrderOk, bool unused);

    /// @notice 쿠폰함 상태 (Used가 Expired보다 먼저). 없는 쿠폰이면 None
    function statusOf(uint256 tokenId) external view returns (Status);
    /// @notice 쿠폰 정보. 없는 쿠폰이면 모든 값이 0
    function couponOf(uint256 tokenId) external view returns (Coupon memory);
    /// @notice 쿠폰을 받은 지갑. 사용(소각) 뒤에도 기록으로 남는다
    function ownerOfCoupon(uint256 tokenId) external view returns (address);

    function merchantOf(uint256 merchantId) external view returns (Merchant memory m, uint256 remaining);
    function campaignOf(uint256 campaignId)
        external
        view
        returns (CampaignStatus status, uint256[] memory merchantIds, uint32 validDays);
    function termOf(uint256 campaignId, uint256 merchantId) external view returns (CampaignTerm memory);
    function issuanceOf(uint256 issuanceId) external view returns (Issuance memory);
    /// @notice 발행 요청으로 만들어진 묶음 번호 (응답이 늦을 때 재호출 전에 조회). 없으면 0
    function issuanceFor(bytes32 requestRef) external view returns (uint256 issuanceId);

    /// @notice 주문으로 발급된 쿠폰 (④-b "발급 확인 중"에서 결과 조회). 미처리면 빈 배열.
    function issuedFor(bytes32 orderRef) external view returns (uint256[] memory tokenIds);

    /// @notice 이 소비자가 이 가게에서 구매한 적이 있는지 (첫 구매 판단)
    function hasPurchased(address buyer, uint256 merchantId) external view returns (bool);
}
