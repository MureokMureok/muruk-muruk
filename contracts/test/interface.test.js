// 인터페이스 v1이 INTERFACE.md에서 합의한 함수·이벤트를 빠짐없이 갖고 있는지 확인한다.
// 구현이 들어오면 이 파일 옆에 시나리오 테스트(시연 8장면)를 추가한다.
import { expect } from "chai";
import { Interface } from "ethers";
import hre from "hardhat";

describe("IMurukCoupon 인터페이스 v1", function () {
  let iface;

  before(async function () {
    // 인터페이스는 배포할 수 없으므로 컴파일 결과(ABI)만 읽는다
    const artifact = await hre.artifacts.readArtifact("IMurukCoupon");
    iface = new Interface(artifact.abi);
  });

  it("KCP·가맹점·소비자 흐름의 쓰기 함수가 모두 있다", function () {
    const writes = [
      "whitelistMerchant",
      "addLimit",
      "createCampaign",
      "decideCampaign",
      "signCampaign",
      "createIssuance",
      "issueForPurchase",
      "redeem",
    ];
    for (const name of writes) {
      expect(iface.getFunction(name), name).to.not.equal(null);
    }
  });

  it("화면용 조회 함수가 모두 있다", function () {
    const reads = [
      "check",
      "checkAll",
      "statusOf",
      "couponOf",
      "ownerOfCoupon",
      "merchantOf",
      "campaignOf",
      "termOf",
      "issuanceOf",
      "issuedFor",
      "hasPurchased",
    ];
    for (const name of reads) {
      expect(iface.getFunction(name), name).to.not.equal(null);
    }
  });

  it("체인 기록용 이벤트가 모두 있다", function () {
    const events = [
      "MerchantWhitelisted",
      "LimitAdded",
      "CampaignCreated",
      "CampaignSigned",
      "CampaignLocked",
      "CampaignDecided",
      "IssuanceCreated",
      "CouponIssued",
      "IssueSkipped",
      "CouponRedeemed",
      "RedeemRejected",
    ];
    for (const name of events) {
      expect(iface.getEvent(name), name).to.not.equal(null);
    }
  });

  it("락업·정률 관련 함수는 없다 (11/1 결정 반영)", function () {
    for (const name of ["lock", "confirm", "release", "quote"]) {
      expect(iface.getFunction(name), name).to.equal(null);
    }
  });
});
