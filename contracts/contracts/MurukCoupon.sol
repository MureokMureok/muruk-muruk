// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IMurukCoupon} from "./interfaces/IMurukCoupon.sol";

/// @title MurukCoupon — 무럭무럭 연합 기획전 쿠폰 구현 (v3: 발급·사용 락업)
/// @notice 동작 기준은 INTERFACE.md, 프론트 모의 API(11/3 core.js · api.js), Figma 와이어프레임, KCP 미팅 "락업".
///         ADMIN = KCP 관리자, OPERATOR = 백엔드 서버 지갑.
contract MurukCoupon is IMurukCoupon, ERC1155, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice 유효기간 "받은 날부터 30일" (모의 API DAYS30) — 발급일 기준
    uint256 public constant VALID_DAYS = 30;
    /// @notice 기획전 참여 가게 수 상한. 구매 1건에 (가게 수 - 1)장을 발급하므로 블록 가스 한도(1,200만) 안에 들게 묶어 둔다
    uint256 public constant MAX_CAMPAIGN_MERCHANTS = 20;
    /// @dev 날짜 경계를 한국 시간으로 계산하기 위한 차이 (UTC+9)
    uint256 private constant KST_OFFSET = 9 hours;

    /// @dev 기획전 저장용. 화면에는 campaignOf로 나눠서 돌려준다.
    struct CampaignData {
        CampaignStatus status;
        uint64 startsAt;
        uint64 endsAt;
        uint256[] merchantIds;
    }

    // 가맹점 심사
    mapping(uint256 merchantId => MerchantStatus) private _merchants;

    // 기획전과 가게별 조건
    mapping(uint256 campaignId => CampaignData) private _campaigns;
    mapping(uint256 campaignId => mapping(uint256 merchantId => Term)) private _terms;
    mapping(uint256 campaignId => mapping(uint256 merchantId => bool)) private _inCampaign;

    // 쿠폰 (tokenId 1장 = 쿠폰 1장)
    uint256 private _lastTokenId;
    mapping(uint256 tokenId => Coupon) private _coupons;
    mapping(uint256 tokenId => address) private _couponOwner; // 사용(소각)·무효 뒤에도 기록으로 남김

    // 발급 주문 (발급 락업)
    mapping(bytes32 orderRef => Order) private _orders;
    mapping(bytes32 orderRef => uint256[]) private _issuedFor;

    // 쿠폰 결제 (사용 락업, 결제 1건 = 쿠폰 1장)
    mapping(bytes32 payRef => Payment) private _payments;

    /// @param admin KCP 관리자 지갑 (역할 관리 권한도 가짐)
    /// @param operator 백엔드 서버 지갑
    constructor(address admin, address operator) ERC1155("") {
        if (admin == address(0) || operator == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    // ───────────── 1단계: 가맹점 심사 (K1) ─────────────

    function reviewMerchant(uint256 merchantId, bool approve) external onlyRole(ADMIN_ROLE) {
        if (_merchants[merchantId] != MerchantStatus.None) revert NotPending(merchantId);
        _merchants[merchantId] = approve ? MerchantStatus.Approved : MerchantStatus.Rejected;
        emit MerchantReviewed(merchantId, approve);
    }

    function merchantOf(uint256 merchantId) external view returns (MerchantStatus) {
        return _merchants[merchantId];
    }

    // ───────────── 2단계: 연합 기획전 (K2 · M2 · M3) ─────────────

    function createCampaign(uint256 campaignId, uint256[] calldata merchantIds, uint64 startsAt, uint64 endsAt)
        external
        onlyRole(ADMIN_ROLE)
    {
        // campaignId 0은 쓰지 않는다 (없는 기획전과 구분)
        if (campaignId == 0 || merchantIds.length < 2 || endsAt < startsAt) revert InvalidCampaign();
        if (merchantIds.length > MAX_CAMPAIGN_MERCHANTS) revert TooManyMerchants(MAX_CAMPAIGN_MERCHANTS);
        CampaignData storage c = _campaigns[campaignId];
        if (c.status != CampaignStatus.None) revert CampaignExists(campaignId);

        for (uint256 i = 0; i < merchantIds.length; i++) {
            uint256 id = merchantIds[i];
            if (_merchants[id] != MerchantStatus.Approved) revert NotApproved(id);
            if (_inCampaign[campaignId][id]) revert InvalidCampaign(); // 같은 가게 중복
            _inCampaign[campaignId][id] = true;
        }

        c.status = CampaignStatus.Preparing;
        c.startsAt = startsAt;
        c.endsAt = endsAt;
        c.merchantIds = merchantIds;
        emit CampaignCreated(campaignId, merchantIds, startsAt, endsAt);
    }

    function registerTerms(
        uint256 campaignId,
        uint256 merchantId,
        uint256 amount,
        uint256 minOrder,
        Validity validity,
        uint256 cap
    ) external onlyRole(OPERATOR_ROLE) {
        CampaignData storage c = _campaigns[campaignId];
        if (c.status == CampaignStatus.None) revert CampaignNotFound(campaignId);
        if (!_inCampaign[campaignId][merchantId]) revert NotInCampaign(campaignId, merchantId);
        if (c.status != CampaignStatus.Preparing) revert TermsLocked(campaignId);
        if (amount == 0 || minOrder < amount || cap < amount) revert InvalidTerms();

        Term storage t = _terms[campaignId][merchantId];
        t.amount = amount;
        t.minOrder = minOrder;
        t.validity = validity;
        t.cap = cap;
        t.maxIssue = cap / amount; // 최대 발급 수 = 할인 한도 ÷ 할인 금액 (M2 요약)
        t.registered = true;
        emit TermsRegistered(campaignId, merchantId, amount, minOrder, validity, cap, t.maxIssue);
    }

    function setCampaignStatus(uint256 campaignId, CampaignStatus next) external onlyRole(ADMIN_ROLE) {
        CampaignData storage c = _campaigns[campaignId];
        if (c.status == CampaignStatus.None) revert CampaignNotFound(campaignId);
        // 종료 시각이 지났으면 이미 끝난 기획전 — 준비 중이었더라도 시작할 수 없다 (K2 "기간이 끝나면 자동 종료")
        if (block.timestamp > c.endsAt) revert InvalidStatus(campaignId);
        CampaignStatus current = c.status;

        bool allowed;
        if (current == CampaignStatus.Preparing) {
            allowed = next == CampaignStatus.Active;
        } else if (current == CampaignStatus.Active) {
            allowed = next == CampaignStatus.Paused || next == CampaignStatus.Ended;
        } else if (current == CampaignStatus.Paused) {
            allowed = next == CampaignStatus.Active || next == CampaignStatus.Ended;
        }
        if (!allowed) revert InvalidStatus(campaignId);

        // 시작 승인은 참여 가게 조건이 모두 등록돼야 한다
        if (current == CampaignStatus.Preparing) {
            for (uint256 i = 0; i < c.merchantIds.length; i++) {
                if (!_terms[campaignId][c.merchantIds[i]].registered) revert NotReady(campaignId);
            }
        }

        c.status = next;
        emit CampaignStatusChanged(campaignId, current, next);
    }

    function campaignOf(uint256 campaignId)
        external
        view
        returns (CampaignStatus status, uint256[] memory merchantIds, uint64 startsAt, uint64 endsAt)
    {
        CampaignData storage c = _campaigns[campaignId];
        return (_effectiveStatus(c), c.merchantIds, c.startsAt, c.endsAt);
    }

    function termOf(uint256 campaignId, uint256 merchantId) external view returns (Term memory) {
        return _terms[campaignId][merchantId];
    }

    /// @dev 진행 중·일시 중지라도 종료 시각이 지났으면 종료로 본다 (K2 "기간이 끝나면 자동 종료")
    function _effectiveStatus(CampaignData storage c) private view returns (CampaignStatus) {
        if ((c.status == CampaignStatus.Active || c.status == CampaignStatus.Paused) && block.timestamp > c.endsAt) {
            return CampaignStatus.Ended;
        }
        return c.status;
    }

    // ───────────── 3단계: 쿠폰 발급 + 발급 락업 (③ ④) ─────────────

    function issueForPurchase(uint256 campaignId, uint256 buyMerchantId, address to, bytes32 orderRef)
        external
        onlyRole(OPERATOR_ROLE)
        returns (uint256[] memory tokenIds)
    {
        if (to == address(0)) revert InvalidAddress();
        if (orderRef == bytes32(0)) revert InvalidRef();
        Order storage o = _orders[orderRef];
        if (o.status != OrderStatus.None) revert OrderAlreadyIssued(orderRef);
        o.status = OrderStatus.Pending;
        o.campaignId = campaignId;
        o.buyer = to;

        uint256[] storage issued = _issuedFor[orderRef];
        CampaignData storage c = _campaigns[campaignId];

        // 진행 중이고 구매 가게가 참여 중일 때만 — 나머지 참여 가게 쿠폰 1장씩 (확정 대기로)
        if (_effectiveStatus(c) == CampaignStatus.Active && _inCampaign[campaignId][buyMerchantId]) {
            for (uint256 i = 0; i < c.merchantIds.length; i++) {
                uint256 mId = c.merchantIds[i];
                if (mId == buyMerchantId) continue; // 구매한 가게 쿠폰은 받지 않는다

                Term storage t = _terms[campaignId][mId];
                // 할인 한도까지 다 발급됐으면 그 가게 쿠폰만 빠진다 (④-c)
                if (t.issuedCount >= t.maxIssue) {
                    emit IssueSkipped(orderRef, mId);
                    continue;
                }
                t.issuedCount += 1;
                issued.push(_mintCoupon(to, campaignId, mId, buyMerchantId, t, orderRef));
            }
        }
        return issued;
    }

    function confirmPurchase(bytes32 orderRef) external onlyRole(OPERATOR_ROLE) {
        Order storage o = _orders[orderRef];
        if (o.status != OrderStatus.Pending) revert OrderNotPending(orderRef);
        o.status = OrderStatus.Confirmed;

        // 유효기간은 발급 때 이미 정해져 있다 (받은 날부터 30일). 확정은 사용 가능으로 바꾸기만 한다
        uint256[] storage ids = _issuedFor[orderRef];
        for (uint256 i = 0; i < ids.length; i++) {
            Coupon storage cp = _coupons[ids[i]];
            cp.state = CouponState.Available;
            emit CouponActivated(ids[i], cp.expiresAt);
        }
        emit PurchaseConfirmed(orderRef, ids.length);
    }

    function cancelPurchase(bytes32 orderRef) external onlyRole(OPERATOR_ROLE) {
        Order storage o = _orders[orderRef];
        if (o.status != OrderStatus.Pending) revert OrderNotPending(orderRef);
        o.status = OrderStatus.Cancelled;

        uint256[] storage ids = _issuedFor[orderRef];
        for (uint256 i = 0; i < ids.length; i++) {
            Coupon storage cp = _coupons[ids[i]];
            cp.state = CouponState.Voided;
            _terms[cp.campaignId][cp.merchantId].issuedCount -= 1; // 쓰일 수 없게 된 쿠폰은 발급 수에서 뺀다
            _burn(o.buyer, ids[i], 1);
            emit CouponVoided(ids[i]);
        }
        emit PurchaseCancelled(orderRef, ids.length);
    }

    function issuedFor(bytes32 orderRef) external view returns (uint256[] memory) {
        return _issuedFor[orderRef];
    }

    function orderOf(bytes32 orderRef) external view returns (Order memory) {
        return _orders[orderRef];
    }

    /// @dev 쿠폰 1장 발급 (확정 대기): 기록 저장 → ERC-1155 토큰 1개 발행 → 이벤트
    function _mintCoupon(
        address to,
        uint256 campaignId,
        uint256 merchantId,
        uint256 fromMerchantId,
        Term storage t,
        bytes32 orderRef
    ) private returns (uint256 tokenId) {
        // 유효기간: 받은 날부터 30일 / 기획전 종료 시각까지 (발급 때 정해짐)
        uint64 expiresAt = t.validity == Validity.CampaignEnd ? _campaigns[campaignId].endsAt : _days30();
        tokenId = ++_lastTokenId;
        Coupon storage cp = _coupons[tokenId];
        cp.campaignId = campaignId;
        cp.merchantId = merchantId;
        cp.fromMerchantId = fromMerchantId;
        cp.amount = t.amount;
        cp.minOrder = t.minOrder;
        cp.orderRef = orderRef;
        cp.issuedAt = uint64(block.timestamp);
        cp.expiresAt = expiresAt;
        cp.state = CouponState.Pending;
        _couponOwner[tokenId] = to;

        _mint(to, tokenId, 1, "");
        emit CouponIssued(tokenId, merchantId, to, campaignId, fromMerchantId, orderRef, expiresAt);
    }

    /// @dev 받은 날(KST)부터 30일째 되는 날 23:59:59 KST (모의 API: 발급일 + 30일, 마지막 날까지 사용 가능)
    function _days30() private view returns (uint64) {
        uint256 dayStart = ((block.timestamp + KST_OFFSET) / 1 days) * 1 days; // KST 기준 오늘 0시 (KST 시각값)
        return uint64(dayStart + (VALID_DAYS + 1) * 1 days - 1 - KST_OFFSET);
    }

    /// @dev 양도 불가: 발급(from = 0)과 소각(to = 0)만 허용한다
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) revert TransferDisabled();
        super._update(from, to, ids, values);
    }

    // ───────────── 4단계: 쿠폰 사용 + 사용 락업 (⑦ ⑧ ⑨) ─────────────

    function lockForPayment(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount, bytes32 payRef)
        external
        onlyRole(OPERATOR_ROLE)
        returns (bool ok, Reason reason)
    {
        if (payRef == bytes32(0)) revert InvalidRef();
        Payment storage p = _payments[payRef];
        // 한 결제에는 쿠폰 1장만 (취소된 결제는 다시 쓸 수 있음)
        if (p.status == PaymentStatus.Locked || p.status == PaymentStatus.Confirmed) revert PaymentExists(payRef);

        reason = _check(tokenId, owner, merchantId, orderAmount);
        if (reason != Reason.Ok) {
            // 거절도 체인에 남기고, 쿠폰 상태는 그대로 둔다
            emit RedeemRejected(tokenId, owner, merchantId, reason, payRef);
            return (false, reason);
        }

        _coupons[tokenId].state = CouponState.Locked;
        p.status = PaymentStatus.Locked;
        p.tokenId = tokenId;
        p.merchantId = merchantId;
        p.orderAmount = orderAmount;
        emit CouponLocked(tokenId, merchantId, owner, orderAmount, payRef);
        return (true, Reason.Ok);
    }

    function confirmPayment(bytes32 payRef) external onlyRole(OPERATOR_ROLE) returns (uint256 discount) {
        Payment storage p = _payments[payRef];
        if (p.status != PaymentStatus.Locked) revert PaymentNotLocked(payRef);
        p.status = PaymentStatus.Confirmed;

        uint256 tokenId = p.tokenId;
        Coupon storage cp = _coupons[tokenId];
        // 정액권: 주문 금액보다 크면 주문 금액까지만 (모의 API calcDiscount).
        // 조건 등록 때 최소 주문 ≥ 할인 금액을 강제하므로 지금 규칙에서는 항상 할인 금액이 된다
        discount = cp.amount < p.orderAmount ? cp.amount : p.orderAmount;
        cp.state = CouponState.Used;
        cp.usedAt = uint64(block.timestamp);
        cp.discount = discount;

        // 할인 부담 = 쓰인 쿠폰의 할인액, 사용처 가게 부담 (M4)
        Term storage t = _terms[cp.campaignId][cp.merchantId];
        t.usedCount += 1;
        t.burden += discount;

        address owner = _couponOwner[tokenId];
        _burn(owner, tokenId, 1);
        emit CouponRedeemed(tokenId, cp.merchantId, owner, cp.fromMerchantId, discount, p.orderAmount, payRef);
    }

    function cancelPayment(bytes32 payRef) external onlyRole(OPERATOR_ROLE) {
        Payment storage p = _payments[payRef];
        if (p.status != PaymentStatus.Locked) revert PaymentNotLocked(payRef);
        p.status = PaymentStatus.Cancelled;
        _coupons[p.tokenId].state = CouponState.Available;
        emit CouponUnlocked(p.tokenId, payRef);
    }

    function paymentOf(bytes32 payRef) external view returns (Payment memory) {
        return _payments[payRef];
    }

    function check(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount)
        external
        view
        returns (Reason)
    {
        return _check(tokenId, owner, merchantId, orderAmount);
    }

    function checkAll(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount)
        public
        view
        returns (bool isOwner, bool merchantOk, bool inPeriod, bool minOrderOk, bool unused)
    {
        Coupon storage cp = _coupons[tokenId];
        if (cp.issuedAt == 0) return (false, false, false, false, false); // 없는 쿠폰

        isOwner = _couponOwner[tokenId] == owner;
        merchantOk = cp.merchantId == merchantId;
        inPeriod = block.timestamp <= cp.expiresAt;
        minOrderOk = orderAmount >= cp.minOrder;
        unused = cp.state == CouponState.Available;
    }

    /// @dev 첫 번째로 실패한 항목을 돌려준다. ⑨-c 5항목 순서 사이에 락업 상태 검사가 끼어 있다
    function _check(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount)
        private
        view
        returns (Reason)
    {
        (bool isOwner, bool merchantOk, bool inPeriod, bool minOrderOk,) = checkAll(tokenId, owner, merchantId, orderAmount);
        CouponState state = _coupons[tokenId].state;
        if (!isOwner) return Reason.NotOwner;
        if (!merchantOk) return Reason.WrongMerchant;
        if (state == CouponState.Voided) return Reason.Voided;
        if (state == CouponState.Pending) return Reason.NotConfirmed;
        if (!inPeriod) return Reason.Expired;
        if (!minOrderOk) return Reason.BelowMinOrder;
        if (state == CouponState.Used) return Reason.AlreadyUsed;
        if (state == CouponState.Locked) return Reason.InUse;
        return Reason.Ok;
    }

    function statusOf(uint256 tokenId) external view returns (Status) {
        Coupon storage cp = _coupons[tokenId];
        if (cp.issuedAt == 0) return Status.None;
        CouponState s = cp.state;
        if (s == CouponState.Pending) return Status.Pending;
        if (s == CouponState.Locked) return Status.InUse;
        if (s == CouponState.Used) return Status.Used;
        if (s == CouponState.Voided) return Status.Voided;
        if (block.timestamp > cp.expiresAt) return Status.Expired;
        return Status.Available;
    }

    function couponOf(uint256 tokenId) external view returns (Coupon memory) {
        return _coupons[tokenId];
    }

    function ownerOfCoupon(uint256 tokenId) external view returns (address) {
        return _couponOwner[tokenId];
    }

    // ───────────── 표준 ─────────────

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
