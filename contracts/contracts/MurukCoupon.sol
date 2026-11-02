// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IMurukCoupon} from "./interfaces/IMurukCoupon.sol";

/// @title MurukCoupon — 무럭무럭 연합 기획전 쿠폰 구현
/// @notice 동작 기준은 INTERFACE.md와 프론트 모의 API(frontend/src/api/api.js).
///         ADMIN = KCP 관리자, OPERATOR = 백엔드 서버 지갑.
contract MurukCoupon is IMurukCoupon, ERC1155, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev 기획전 저장용. 화면에는 campaignOf로 나눠서 돌려준다.
    struct CampaignData {
        CampaignStatus status;
        uint32 validDays;
        uint32 signedCount;
        uint256[] merchantIds;
    }

    // 가맹점·한도
    mapping(uint256 merchantId => Merchant) private _merchants;

    // 기획전
    mapping(uint256 campaignId => CampaignData) private _campaigns;
    mapping(uint256 campaignId => mapping(uint256 merchantId => CampaignTerm)) private _terms;
    mapping(uint256 campaignId => mapping(uint256 merchantId => bool)) private _inCampaign;

    // 직접 발행
    uint256 private _lastIssuanceId;
    mapping(uint256 issuanceId => Issuance) private _issuances;
    mapping(uint256 merchantId => uint256[]) private _issuancesOf;

    // 쿠폰 (tokenId 1장 = 쿠폰 1장)
    uint256 private _lastTokenId;
    mapping(uint256 tokenId => Coupon) private _coupons;
    mapping(uint256 tokenId => address) private _couponOwner; // 사용(소각) 뒤에도 기록으로 남김

    // 구매 기록
    mapping(bytes32 orderRef => bool) private _orderDone;
    mapping(bytes32 orderRef => uint256[]) private _issuedFor;
    mapping(address buyer => mapping(uint256 merchantId => bool)) private _purchased;

    /// @param admin KCP 관리자 지갑 (역할 관리 권한도 가짐)
    /// @param operator 백엔드 서버 지갑
    constructor(address admin, address operator) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    // ───────────── 1단계: 가맹점·한도 ─────────────

    function whitelistMerchant(uint256 merchantId) external onlyRole(ADMIN_ROLE) {
        _merchants[merchantId].whitelisted = true;
        emit MerchantWhitelisted(merchantId);
    }

    function addLimit(uint256 merchantId, uint256 amount, bytes32 depositRef) external onlyRole(ADMIN_ROLE) {
        Merchant storage m = _merchants[merchantId];
        if (!m.whitelisted) revert NotWhitelisted(merchantId);
        if (amount == 0) revert InvalidAmount();

        m.limit += amount;
        emit LimitAdded(merchantId, amount, m.limit, depositRef);
    }

    function merchantOf(uint256 merchantId) external view returns (Merchant memory m, uint256 remaining) {
        m = _merchants[merchantId];
        remaining = m.limit - m.reserved;
    }

    /// @dev 남은 한도에서 금액을 묶는다 (기획전 충전금·직접 발행분 공통)
    function _reserve(uint256 merchantId, uint256 amount) private {
        Merchant storage m = _merchants[merchantId];
        uint256 remaining = m.limit - m.reserved;
        if (amount > remaining) revert LimitExceeded(merchantId, amount, remaining);
        m.reserved += amount;
    }

    // ───────────── 2단계: 기획전 ─────────────

    function createCampaign(uint256 campaignId, uint256[] calldata merchantIds, uint32 validDays)
        external
        onlyRole(ADMIN_ROLE)
    {
        // campaignId 0은 issueForPurchase에서 "기획전 없음"이라 쓸 수 없다
        if (campaignId == 0 || merchantIds.length == 0 || validDays == 0) revert InvalidAmount();
        CampaignData storage c = _campaigns[campaignId];
        if (c.status != CampaignStatus.None) revert CampaignExists(campaignId);

        for (uint256 i = 0; i < merchantIds.length; i++) {
            uint256 id = merchantIds[i];
            if (!_merchants[id].whitelisted) revert NotWhitelisted(id);
            if (_inCampaign[campaignId][id]) revert InvalidAmount(); // 같은 가게 중복
            _inCampaign[campaignId][id] = true;
        }

        c.status = CampaignStatus.Signing;
        c.validDays = validDays;
        c.merchantIds = merchantIds;
        emit CampaignCreated(campaignId, merchantIds, validDays);
    }

    function signCampaign(uint256 campaignId, uint256 merchantId, uint256 amount, uint256 minOrder, uint256 fund)
        external
        onlyRole(OPERATOR_ROLE)
    {
        CampaignData storage c = _campaigns[campaignId];
        if (c.status == CampaignStatus.None) revert CampaignNotFound(campaignId);
        if (!_inCampaign[campaignId][merchantId]) revert NotInCampaign(campaignId, merchantId);
        if (c.status != CampaignStatus.Signing) revert CampaignNotSigning(campaignId);

        CampaignTerm storage t = _terms[campaignId][merchantId];
        if (t.signed) revert AlreadySigned(campaignId, merchantId);
        if (amount == 0) revert InvalidAmount();

        _reserve(merchantId, fund);
        t.amount = amount;
        t.minOrder = minOrder;
        t.fund = fund;
        t.signed = true;
        emit CampaignSigned(campaignId, merchantId, amount, minOrder, fund);

        // 참여 가게 전원이 서명하면 규칙 잠금 → KCP 승인 대기
        c.signedCount += 1;
        if (c.signedCount == c.merchantIds.length) {
            c.status = CampaignStatus.PendingApproval;
            emit CampaignLocked(campaignId);
        }
    }

    function decideCampaign(uint256 campaignId, bool approve) external onlyRole(ADMIN_ROLE) {
        CampaignData storage c = _campaigns[campaignId];
        if (c.status != CampaignStatus.PendingApproval) revert CampaignNotPending(campaignId);
        c.status = approve ? CampaignStatus.Active : CampaignStatus.Rejected;
        emit CampaignDecided(campaignId, approve);
    }

    function campaignOf(uint256 campaignId)
        external
        view
        returns (CampaignStatus status, uint256[] memory merchantIds, uint32 validDays)
    {
        CampaignData storage c = _campaigns[campaignId];
        return (c.status, c.merchantIds, c.validDays);
    }

    function termOf(uint256 campaignId, uint256 merchantId) external view returns (CampaignTerm memory) {
        return _terms[campaignId][merchantId];
    }

    // ───────────── 3단계: 쿠폰 발급 ─────────────

    function createIssuance(
        uint256 merchantId,
        uint256 amount,
        uint256 minOrder,
        ReceiveRule receiveRule,
        uint256 receiveMin,
        uint32 validDays,
        uint32 qty
    ) external onlyRole(OPERATOR_ROLE) returns (uint256 issuanceId) {
        if (amount == 0 || qty == 0 || validDays == 0) revert InvalidAmount();
        if (_merchants[merchantId].limit == 0) revert NoLimit(merchantId);

        uint256 total = amount * qty;
        _reserve(merchantId, total);

        issuanceId = ++_lastIssuanceId;
        Issuance storage s = _issuances[issuanceId];
        s.merchantId = merchantId;
        s.amount = amount;
        s.minOrder = minOrder;
        s.receiveRule = receiveRule;
        s.receiveMin = receiveMin;
        s.expiresAt = uint64(block.timestamp + uint256(validDays) * 1 days);
        s.qty = qty;
        _issuancesOf[merchantId].push(issuanceId);

        emit IssuanceCreated(issuanceId, merchantId, amount, qty, total);
    }

    function issueForPurchase(uint256 campaignId, uint256 buyMerchantId, address to, uint256 orderAmount, bytes32 orderRef)
        external
        onlyRole(OPERATOR_ROLE)
        returns (uint256[] memory tokenIds)
    {
        if (_orderDone[orderRef]) revert OrderAlreadyIssued(orderRef);
        _orderDone[orderRef] = true;

        // 첫 구매 판단은 이번 구매를 기록하기 전에 한다
        bool boughtBefore = _purchased[to][buyMerchantId];
        _purchased[to][buyMerchantId] = true;

        uint256[] storage issued = _issuedFor[orderRef];

        // 1) 기획전 쿠폰: 진행 중인 기획전에 구매 가게가 참여 중이면, 나머지 가게 쿠폰 1장씩
        if (campaignId != 0) {
            CampaignData storage c = _campaigns[campaignId];
            if (c.status == CampaignStatus.Active && _inCampaign[campaignId][buyMerchantId]) {
                uint64 expiresAt = uint64(block.timestamp + uint256(c.validDays) * 1 days);
                for (uint256 i = 0; i < c.merchantIds.length; i++) {
                    uint256 mId = c.merchantIds[i];
                    if (mId == buyMerchantId) continue;

                    CampaignTerm storage t = _terms[campaignId][mId];
                    // 충전금이 부족하면 그 가게 쿠폰만 빠진다 (쏠림 대응)
                    if (t.fund - t.fundReserved < t.amount) {
                        emit IssueSkipped(orderRef, mId);
                        continue;
                    }
                    t.fundReserved += t.amount;
                    Coupon memory cp;
                    cp.source = CouponSource.Campaign;
                    cp.campaignId = campaignId;
                    cp.merchantId = mId;
                    cp.fromMerchantId = buyMerchantId;
                    cp.amount = t.amount;
                    cp.minOrder = t.minOrder;
                    cp.expiresAt = expiresAt;
                    issued.push(_mintCoupon(to, cp, orderRef));
                }
            }
        }

        // 2) 보너스 쿠폰: 구매 가게가 직접 발행한 묶음 중 받는 조건을 채우고 수량이 남은 것
        uint256[] storage ids = _issuancesOf[buyMerchantId];
        for (uint256 i = 0; i < ids.length; i++) {
            Issuance storage s = _issuances[ids[i]];
            if (s.issuedCount >= s.qty || orderAmount < s.receiveMin) continue;
            if (s.receiveRule == ReceiveRule.FirstPurchase && boughtBefore) continue;

            s.issuedCount += 1;
            Coupon memory cp;
            cp.source = CouponSource.Issuance;
            cp.issuanceId = ids[i];
            cp.merchantId = buyMerchantId;
            cp.fromMerchantId = buyMerchantId;
            cp.amount = s.amount;
            cp.minOrder = s.minOrder;
            cp.expiresAt = s.expiresAt;
            issued.push(_mintCoupon(to, cp, orderRef));
        }

        return issued;
    }

    /// @dev 쿠폰 1장 발급: 기록 저장 → ERC-1155 토큰 1개 발행 → 이벤트
    function _mintCoupon(address to, Coupon memory cp, bytes32 orderRef) private returns (uint256 tokenId) {
        tokenId = ++_lastTokenId;
        cp.issuedAt = uint64(block.timestamp);
        _coupons[tokenId] = cp;
        _couponOwner[tokenId] = to;

        _mint(to, tokenId, 1, "");
        emit CouponIssued(tokenId, cp.merchantId, to, cp.source, cp.fromMerchantId, orderRef, cp.expiresAt);
    }

    function issuanceOf(uint256 issuanceId) external view returns (Issuance memory) {
        return _issuances[issuanceId];
    }

    function issuedFor(bytes32 orderRef) external view returns (uint256[] memory) {
        return _issuedFor[orderRef];
    }

    function hasPurchased(address buyer, uint256 merchantId) external view returns (bool) {
        return _purchased[buyer][merchantId];
    }

    /// @dev 양도 불가: 발급(from = 0)과 소각(to = 0)만 허용한다
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) revert TransferDisabled();
        super._update(from, to, ids, values);
    }

    // ───────────── 4단계: 쿠폰 사용 ─────────────

    function redeem(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount, bytes32 orderRef)
        external
        onlyRole(OPERATOR_ROLE)
        returns (bool ok, Reason reason, uint256 discount)
    {
        reason = _check(tokenId, owner, merchantId, orderAmount);
        if (reason != Reason.Ok) {
            // 거절도 체인에 남기고, 쿠폰 상태는 그대로 둔다
            emit RedeemRejected(tokenId, owner, reason, orderRef);
            return (false, reason, 0);
        }

        Coupon storage cp = _coupons[tokenId];
        // 정액권: 주문 금액보다 크면 주문 금액까지만 (모의 API calcDiscount와 같음)
        discount = cp.amount < orderAmount ? cp.amount : orderAmount;
        cp.used = true;
        cp.usedAt = uint64(block.timestamp);

        // 할인 비용은 사용처 가게 부담 → 정산용 사용액에 더한다
        if (cp.source == CouponSource.Campaign) {
            _terms[cp.campaignId][cp.merchantId].fundUsed += discount;
        } else {
            Issuance storage s = _issuances[cp.issuanceId];
            s.usedCount += 1;
            s.usedAmount += discount;
        }

        _burn(owner, tokenId, 1);
        emit CouponRedeemed(tokenId, merchantId, owner, discount, orderRef);
        return (true, Reason.Ok, discount);
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
        unused = !cp.used;
    }

    /// @dev ⑨-c 화면 순서대로 첫 번째로 실패한 항목을 돌려준다
    function _check(uint256 tokenId, address owner, uint256 merchantId, uint256 orderAmount)
        private
        view
        returns (Reason)
    {
        (bool isOwner, bool merchantOk, bool inPeriod, bool minOrderOk, bool unused) =
            checkAll(tokenId, owner, merchantId, orderAmount);
        if (!isOwner) return Reason.NotOwner;
        if (!merchantOk) return Reason.WrongMerchant;
        if (!inPeriod) return Reason.Expired;
        if (!minOrderOk) return Reason.BelowMinOrder;
        if (!unused) return Reason.AlreadyUsed;
        return Reason.Ok;
    }

    function statusOf(uint256 tokenId) external view returns (Status) {
        Coupon storage cp = _coupons[tokenId];
        if (cp.issuedAt == 0) return Status.None;
        if (cp.used) return Status.Used;
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
