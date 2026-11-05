// 2단계: 연합 기획전 만들기 → 쿠폰 조건 등록 → 시작·일시 중지·종료 (KCP K2 · 가맹점 M2 · 모의 API)
import { expect } from "chai";
import {
  withMerchants,
  withCampaign,
  withTerms,
  withActiveCampaign,
  time,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  WILDFLOWER,
  DAY,
  TERMS,
  CampaignStatus,
  Validity,
} from "./helpers.js";

describe("2단계 연합 기획전", function () {
  describe("기획전 만들기", function () {
    it("승인된 가게 3곳으로 만들면 준비 중으로 시작한다", async function () {
      const { coupon } = await withMerchants();
      const now = BigInt(await time.latest());
      await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], now, now + 30n * DAY))
        .to.emit(coupon, "CampaignCreated")
        .withArgs(CAMPAIGN, [ORCHARD, FLOWER, SEA], now, now + 30n * DAY);

      const [status, ids, startsAt, endsAt] = await coupon.campaignOf(CAMPAIGN);
      expect(status).to.equal(CampaignStatus.Preparing);
      expect(ids).to.deep.equal([ORCHARD, FLOWER, SEA]);
      expect(endsAt - startsAt).to.equal(30n * DAY);
    });

    it("승인되지 않은 가게(심사 대기·반려)는 넣을 수 없다", async function () {
      const { coupon } = await withMerchants();
      await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, WILDFLOWER], 0, 1))
        .to.be.revertedWithCustomError(coupon, "NotApproved")
        .withArgs(WILDFLOWER);

      await coupon.reviewMerchant(WILDFLOWER, false);
      await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, WILDFLOWER], 0, 1)).to.be.revertedWithCustomError(
        coupon,
        "NotApproved",
      );
    });

    it("참여 가게 2곳 미만, 종료가 시작보다 앞섬, 같은 가게 중복, 번호 0은 거절된다", async function () {
      const { coupon } = await withMerchants();
      const bad = [
        [CAMPAIGN, [ORCHARD], 0, 1],
        [CAMPAIGN, [ORCHARD, FLOWER], 10, 9],
        [CAMPAIGN, [ORCHARD, ORCHARD], 0, 1],
        [0n, [ORCHARD, FLOWER], 0, 1],
      ];
      for (const args of bad) {
        await expect(coupon.createCampaign(...args)).to.be.revertedWithCustomError(coupon, "InvalidCampaign");
      }
    });

    it("같은 번호로 두 번 만들 수 없고, 백엔드는 만들 수 없다", async function () {
      const { coupon, backend } = await withCampaign();
      await expect(coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER], 0, 1))
        .to.be.revertedWithCustomError(coupon, "CampaignExists")
        .withArgs(CAMPAIGN);
      await expect(coupon.connect(backend).createCampaign(2n, [ORCHARD, FLOWER], 0, 1)).to.be.revertedWithCustomError(
        coupon,
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("쿠폰 조건 등록 (M2)", function () {
    it("등록하면 최대 발급 수 = 할인 한도 ÷ 할인 금액이 계산되고 기록이 남는다", async function () {
      const { coupon, backend } = await withCampaign();
      const t = TERMS[FLOWER];
      await expect(coupon.connect(backend).registerTerms(CAMPAIGN, FLOWER, t.amount, t.minOrder, t.validity, t.cap))
        .to.emit(coupon, "TermsRegistered")
        .withArgs(CAMPAIGN, FLOWER, 3_000n, 15_000n, Validity.Days30, 300_000n, 100n);

      const term = await coupon.termOf(CAMPAIGN, FLOWER);
      expect(term.registered).to.equal(true);
      expect(term.maxIssue).to.equal(100n); // 300,000 ÷ 3,000
    });

    it("나누어떨어지지 않으면 내림한다 (100,000 ÷ 3,000 = 33장)", async function () {
      const { coupon, backend } = await withCampaign();
      await coupon.connect(backend).registerTerms(CAMPAIGN, FLOWER, 3_000n, 15_000n, Validity.Days30, 100_000n);
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).maxIssue).to.equal(33n);
    });

    it("준비 중에는 다시 등록해서 바꿀 수 있다 (변경 이력은 이벤트로 남음)", async function () {
      const { coupon, backend } = await withCampaign();
      const op = coupon.connect(backend);
      await op.registerTerms(CAMPAIGN, FLOWER, 3_000n, 15_000n, Validity.Days30, 300_000n);
      await expect(op.registerTerms(CAMPAIGN, FLOWER, 2_000n, 10_000n, Validity.CampaignEnd, 100_000n)).to.emit(
        coupon,
        "TermsRegistered",
      );
      const term = await coupon.termOf(CAMPAIGN, FLOWER);
      expect(term.amount).to.equal(2_000n);
      expect(term.validity).to.equal(Validity.CampaignEnd);
      expect(term.maxIssue).to.equal(50n);
    });

    it("입력 검증: 할인 0원, 최소 주문 < 할인 금액, 할인 한도 < 할인 금액은 거절 (같으면 허용)", async function () {
      const { coupon, backend } = await withCampaign();
      const op = coupon.connect(backend);
      for (const [amount, minOrder, cap] of [
        [0n, 15_000n, 300_000n],
        [3_000n, 2_999n, 300_000n],
        [3_000n, 15_000n, 2_999n],
      ]) {
        await expect(op.registerTerms(CAMPAIGN, FLOWER, amount, minOrder, Validity.Days30, cap)).to.be.revertedWithCustomError(
          coupon,
          "InvalidTerms",
        );
      }
      await op.registerTerms(CAMPAIGN, FLOWER, 3_000n, 3_000n, Validity.Days30, 3_000n);
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).maxIssue).to.equal(1n);
    });

    it("없는 기획전, 참여하지 않은 가게는 등록할 수 없다", async function () {
      const { coupon, backend } = await withCampaign();
      const op = coupon.connect(backend);
      await expect(op.registerTerms(9n, FLOWER, 3_000n, 15_000n, 0, 300_000n))
        .to.be.revertedWithCustomError(coupon, "CampaignNotFound")
        .withArgs(9n);
      await expect(op.registerTerms(CAMPAIGN, WILDFLOWER, 3_000n, 15_000n, 0, 300_000n))
        .to.be.revertedWithCustomError(coupon, "NotInCampaign")
        .withArgs(CAMPAIGN, WILDFLOWER);
    });

    it("시작된 기획전의 조건은 바꿀 수 없다 (LOCKED)", async function () {
      const { coupon, backend } = await withActiveCampaign();
      await expect(coupon.connect(backend).registerTerms(CAMPAIGN, FLOWER, 1_000n, 15_000n, 0, 300_000n))
        .to.be.revertedWithCustomError(coupon, "TermsLocked")
        .withArgs(CAMPAIGN);
    });

    it("조건 등록은 백엔드만 할 수 있다", async function () {
      const { coupon, kcp, alice } = await withCampaign();
      for (const who of [kcp, alice]) {
        await expect(
          coupon.connect(who).registerTerms(CAMPAIGN, FLOWER, 3_000n, 15_000n, 0, 300_000n),
        ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
      }
    });
  });

  describe("시작 승인 · 일시 중지 · 종료 (K2)", function () {
    it("조건이 모두 등록돼야 시작할 수 있다 (NOT_READY)", async function () {
      const { coupon, backend } = await withCampaign();
      const t = TERMS[ORCHARD];
      await coupon.connect(backend).registerTerms(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.validity, t.cap);
      await expect(coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Active))
        .to.be.revertedWithCustomError(coupon, "NotReady")
        .withArgs(CAMPAIGN);
    });

    it("준비 중 → 진행 중 → 일시 중지 → 다시 진행 → 종료, 바뀔 때마다 기록이 남는다", async function () {
      const { coupon } = await withTerms();
      const steps = [
        [CampaignStatus.Preparing, CampaignStatus.Active],
        [CampaignStatus.Active, CampaignStatus.Paused],
        [CampaignStatus.Paused, CampaignStatus.Active],
        [CampaignStatus.Active, CampaignStatus.Ended],
      ];
      for (const [from, to] of steps) {
        await expect(coupon.setCampaignStatus(CAMPAIGN, to))
          .to.emit(coupon, "CampaignStatusChanged")
          .withArgs(CAMPAIGN, from, to);
        expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(to);
      }
    });

    it("일시 중지에서 바로 종료할 수 있다", async function () {
      const { coupon } = await withActiveCampaign();
      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Paused);
      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Ended);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Ended);
    });

    it("허용되지 않은 전환은 거절된다 (INVALID_STATUS)", async function () {
      const { coupon } = await withTerms();
      const S = CampaignStatus;
      // 준비 중에서는 진행 중으로만
      for (const to of [S.Paused, S.Ended, S.Preparing, S.None]) {
        await expect(coupon.setCampaignStatus(CAMPAIGN, to)).to.be.revertedWithCustomError(coupon, "InvalidStatus");
      }
      await coupon.setCampaignStatus(CAMPAIGN, S.Active);
      for (const to of [S.Active, S.Preparing]) {
        await expect(coupon.setCampaignStatus(CAMPAIGN, to)).to.be.revertedWithCustomError(coupon, "InvalidStatus");
      }
      await coupon.setCampaignStatus(CAMPAIGN, S.Ended);
      // 종료 뒤에는 아무 데로도
      for (const to of [S.Active, S.Paused, S.Ended]) {
        await expect(coupon.setCampaignStatus(CAMPAIGN, to)).to.be.revertedWithCustomError(coupon, "InvalidStatus");
      }
    });

    it("종료 시각이 지나면 자동으로 종료로 보이고, 다시 진행할 수 없다", async function () {
      const { coupon, endsAt } = await withActiveCampaign();
      await time.increaseTo(endsAt + 1n);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Ended);
      await expect(coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Paused)).to.be.revertedWithCustomError(
        coupon,
        "InvalidStatus",
      );
    });

    it("종료 시각 정각까지는 진행 중이고, 1초 지나면 종료로 보인다", async function () {
      const { coupon, endsAt } = await withActiveCampaign();
      await time.increaseTo(endsAt);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Active);
      await time.increaseTo(endsAt + 1n);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Ended);
    });

    it("일시 중지 중에 종료 시각이 지나면 자동 종료 — 다시 진행도, 종료 처리도 할 수 없다", async function () {
      const { coupon, endsAt } = await withActiveCampaign();
      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Paused);
      await time.increaseTo(endsAt + 1n);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Ended);
      for (const to of [CampaignStatus.Active, CampaignStatus.Ended]) {
        await expect(coupon.setCampaignStatus(CAMPAIGN, to)).to.be.revertedWithCustomError(coupon, "InvalidStatus");
      }
    });

    it("종료 시각이 지난 준비 중 기획전은 시작 승인할 수 없다 (기록에 없는 '시작'이 남지 않게)", async function () {
      const { coupon, endsAt } = await withTerms();
      await time.increaseTo(endsAt + 1n);
      await expect(coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Active))
        .to.be.revertedWithCustomError(coupon, "InvalidStatus")
        .withArgs(CAMPAIGN);
    });

    it("없는 기획전은 바꿀 수 없고, 상태 변경은 KCP만 할 수 있다", async function () {
      const { coupon, backend } = await withTerms();
      await expect(coupon.setCampaignStatus(9n, CampaignStatus.Active))
        .to.be.revertedWithCustomError(coupon, "CampaignNotFound")
        .withArgs(9n);
      await expect(
        coupon.connect(backend).setCampaignStatus(CAMPAIGN, CampaignStatus.Active),
      ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
    });
  });
});
