// 인터페이스 v2가 INTERFACE.md에서 정한 함수·이벤트를 빠짐없이 갖고 있는지 확인한다.
// 동작은 1~6번 시나리오 테스트에서 확인한다.
import { expect } from "chai";
import { Interface } from "ethers";
import hre from "hardhat";

describe("IMurukCoupon 인터페이스 v2", function () {
  let iface, impl;

  before(async function () {
    // 인터페이스는 배포할 수 없으므로 컴파일 결과(ABI)만 읽는다. 구현 ABI도 같이 본다
    iface = new Interface((await hre.artifacts.readArtifact("IMurukCoupon")).abi);
    impl = new Interface((await hre.artifacts.readArtifact("MurukCoupon")).abi);
  });

  it("KCP·가맹점·소비자 흐름의 쓰기 함수가 모두 있다", function () {
    for (const name of [
      "reviewMerchant",
      "createCampaign",
      "setCampaignStatus",
      "registerTerms",
      "issueForPurchase",
      "confirmPurchase",
      "cancelPurchase",
      "lockForPayment",
      "confirmPayment",
      "cancelPayment",
    ]) {
      expect(iface.getFunction(name), name).to.not.equal(null);
    }
  });

  it("화면용 조회 함수가 모두 있다", function () {
    for (const name of [
      "check",
      "checkAll",
      "statusOf",
      "couponOf",
      "ownerOfCoupon",
      "merchantOf",
      "campaignOf",
      "termOf",
      "issuedFor",
      "orderOf",
      "paymentOf",
    ]) {
      expect(iface.getFunction(name), name).to.not.equal(null);
    }
  });

  it("체인 기록용 이벤트가 모두 있다", function () {
    for (const name of [
      "MerchantReviewed",
      "CampaignCreated",
      "TermsRegistered",
      "CampaignStatusChanged",
      "CouponIssued",
      "IssueSkipped",
      "PurchaseConfirmed",
      "CouponActivated",
      "PurchaseCancelled",
      "CouponVoided",
      "CouponLocked",
      "CouponUnlocked",
      "CouponRedeemed",
      "RedeemRejected",
    ]) {
      expect(iface.getEvent(name), name).to.not.equal(null);
    }
  });

  it("범위에서 뺀 기능은 없다 (예치금·서명·직접 발행 11/3 폐지, 즉시 소각 redeem → 사용 락업으로 대체)", function () {
    for (const name of [
      "whitelistMerchant",
      "addLimit",
      "signCampaign",
      "decideCampaign",
      "cancelCampaign",
      "createIssuance",
      "redeem",
    ]) {
      expect(iface.getFunction(name), name).to.equal(null);
      expect(impl.getFunction(name), `MurukCoupon.${name}`).to.equal(null);
    }
  });

  it("인터페이스의 함수·이벤트를 구현이 같은 모양(인자 타입)으로 갖고 있다", function () {
    iface.forEachFunction((f) => expect(impl.getFunction(f.format("sighash")), f.format("sighash")).to.not.equal(null));
    iface.forEachEvent((e) => expect(impl.getEvent(e.format("sighash")), e.format("sighash")).to.not.equal(null));
  });
});
