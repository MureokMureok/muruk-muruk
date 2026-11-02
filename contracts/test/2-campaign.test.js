// 2단계: 연합 기획전 생성 → 가게별 서명 → 전원 서명 시 규칙 잠금 → KCP 승인·반려 (시연 ①·③)
import { expect } from "chai";
import {
  withMerchants,
  withSignedCampaign,
  CAMPAIGN,
  VALID_DAYS,
  ORCHARD,
  FLOWER,
  SEA,
  TERMS,
  CampaignStatus,
} from "./helpers.js";

describe("2단계 기획전", function () {
  it("KCP가 3곳 기획전을 만들면 서명 중 상태로 시작한다", async function () {
    const { coupon } = await withMerchants();
    await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], VALID_DAYS))
      .to.emit(coupon, "CampaignCreated")
      .withArgs(CAMPAIGN, [ORCHARD, FLOWER, SEA], VALID_DAYS);

    const [status, merchantIds, validDays] = await coupon.campaignOf(CAMPAIGN);
    expect(status).to.equal(CampaignStatus.Signing);
    expect(merchantIds).to.deep.equal([ORCHARD, FLOWER, SEA]);
    expect(validDays).to.equal(30n);
  });

  it("등록 안 된 가게는 기획전에 넣을 수 없다", async function () {
    const { coupon } = await withMerchants();
    await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, 99n], VALID_DAYS))
      .to.be.revertedWithCustomError(coupon, "NotWhitelisted")
      .withArgs(99n);
  });

  it("같은 번호의 기획전은 두 번 만들 수 없다", async function () {
    const { coupon } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS)).to.be.revertedWithCustomError(
      coupon,
      "CampaignExists",
    );
  });

  it("기획전 번호 0, 빈 가게 목록, 유효기간 0일, 같은 가게 중복은 거절된다", async function () {
    const { coupon } = await withMerchants();
    for (const args of [
      [0n, [ORCHARD], VALID_DAYS],
      [CAMPAIGN, [], VALID_DAYS],
      [CAMPAIGN, [ORCHARD], 0],
      [CAMPAIGN, [ORCHARD, ORCHARD], VALID_DAYS],
    ]) {
      await expect(coupon.createCampaign(...args)).to.be.revertedWithCustomError(coupon, "InvalidAmount");
    }
  });

  it("가게가 서명하면 충전금만큼 남은 한도가 묶인다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], VALID_DAYS);

    const t = TERMS[ORCHARD];
    await expect(coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.fund))
      .to.emit(coupon, "CampaignSigned")
      .withArgs(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.fund);

    const [m, remaining] = await coupon.merchantOf(ORCHARD);
    expect(m.reserved).to.equal(200_000n);
    expect(remaining).to.equal(300_000n);

    const term = await coupon.termOf(CAMPAIGN, ORCHARD);
    expect(term.signed).to.equal(true);
    expect(term.amount).to.equal(2_000n);
  });

  it("3곳이 모두 서명하면 규칙이 잠기고 KCP 승인 대기가 된다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], VALID_DAYS);
    for (const id of [ORCHARD, FLOWER]) {
      const t = TERMS[id];
      await expect(coupon.connect(backend).signCampaign(CAMPAIGN, id, t.amount, t.minOrder, t.fund)).to.not.emit(
        coupon,
        "CampaignLocked",
      );
    }
    const t = TERMS[SEA];
    await expect(coupon.connect(backend).signCampaign(CAMPAIGN, SEA, t.amount, t.minOrder, t.fund))
      .to.emit(coupon, "CampaignLocked")
      .withArgs(CAMPAIGN);

    const [status] = await coupon.campaignOf(CAMPAIGN);
    expect(status).to.equal(CampaignStatus.PendingApproval);
  });

  it("규칙이 잠긴 뒤에는 누구도 조건을 바꿀 수 없다", async function () {
    const { coupon, backend } = await withSignedCampaign();
    await expect(
      coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, 9_000n, 0n, 0n),
    ).to.be.revertedWithCustomError(coupon, "CampaignNotSigning");
  });

  it("같은 가게는 두 번 서명할 수 없다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    const t = TERMS[ORCHARD];
    await coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.fund);
    await expect(coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.fund))
      .to.be.revertedWithCustomError(coupon, "AlreadySigned")
      .withArgs(CAMPAIGN, ORCHARD);
  });

  it("충전금이 남은 한도보다 크면 서명할 수 없다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    await expect(coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, 2_000n, 10_000n, 600_000n))
      .to.be.revertedWithCustomError(coupon, "LimitExceeded")
      .withArgs(ORCHARD, 600_000n, 500_000n);
  });

  it("참여하지 않은 가게나 없는 기획전에는 서명할 수 없다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    await expect(coupon.connect(backend).signCampaign(CAMPAIGN, SEA, 3_000n, 0n, 0n)).to.be.revertedWithCustomError(
      coupon,
      "NotInCampaign",
    );
    await expect(coupon.connect(backend).signCampaign(7n, ORCHARD, 3_000n, 0n, 0n)).to.be.revertedWithCustomError(
      coupon,
      "CampaignNotFound",
    );
  });

  it("할인 금액 0원으로는 서명할 수 없다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    await expect(coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, 0n, 0n, 0n)).to.be.revertedWithCustomError(
      coupon,
      "InvalidAmount",
    );
  });

  it("KCP가 승인하면 진행 중, 반려하면 반려 상태가 된다", async function () {
    const a = await withSignedCampaign();
    await expect(a.coupon.decideCampaign(CAMPAIGN, true)).to.emit(a.coupon, "CampaignDecided").withArgs(CAMPAIGN, true);
    expect((await a.coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Active);

    const b = await withSignedCampaign();
    await b.coupon.decideCampaign(CAMPAIGN, false);
    expect((await b.coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Rejected);
  });

  it("서명이 덜 끝났거나 이미 결정된 기획전은 승인할 수 없다", async function () {
    const { coupon, backend } = await withMerchants();
    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    await expect(coupon.decideCampaign(CAMPAIGN, true)).to.be.revertedWithCustomError(coupon, "CampaignNotPending");

    for (const id of [ORCHARD, FLOWER]) {
      const t = TERMS[id];
      await coupon.connect(backend).signCampaign(CAMPAIGN, id, t.amount, t.minOrder, t.fund);
    }
    await coupon.decideCampaign(CAMPAIGN, true);
    await expect(coupon.decideCampaign(CAMPAIGN, false)).to.be.revertedWithCustomError(coupon, "CampaignNotPending");
  });

  it("기획전 생성·승인은 KCP만, 서명은 백엔드만 할 수 있다", async function () {
    const { coupon, kcp, backend } = await withMerchants();
    await expect(
      coupon.connect(backend).createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS),
    ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");

    await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], VALID_DAYS);
    await expect(coupon.connect(kcp).signCampaign(CAMPAIGN, ORCHARD, 2_000n, 0n, 0n)).to.be.revertedWithCustomError(
      coupon,
      "AccessControlUnauthorizedAccount",
    );
  });
});
