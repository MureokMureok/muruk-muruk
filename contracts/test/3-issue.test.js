// 3단계: 쿠폰 발급 — 가맹점 직접 발행 묶음 등록, 구매 시 기획전·보너스 쿠폰 발급, 양도 불가 (시연 ②·④)
import { expect } from "chai";
import {
  withMerchants,
  withSignedCampaign,
  withActiveCampaign,
  buy,
  ref,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  FIELD,
  TERMS,
  ReceiveRule,
  Status,
} from "./helpers.js";

const DAY = 24n * 60n * 60n;

describe("3단계 쿠폰 발급", function () {
  describe("가맹점 직접 발행 쿠폰 등록", function () {
    it("할인액 × 수량만큼 남은 한도가 묶인다", async function () {
      const { coupon, backend } = await withMerchants();
      await expect(
        coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 5_000n, ReceiveRule.FirstPurchase, 10_000n, 14, 50),
      )
        .to.emit(coupon, "IssuanceCreated")
        .withArgs(1n, ORCHARD, 1_000n, 50n, 50_000n);

      const [, remaining] = await coupon.merchantOf(ORCHARD);
      expect(remaining).to.equal(450_000n);
      const s = await coupon.issuanceOf(1n);
      expect(s.qty).to.equal(50n);
      expect(s.issuedCount).to.equal(0n);
    });

    it("한도가 없는 가게는 발행할 수 없다", async function () {
      const { coupon, backend } = await withMerchants();
      await coupon.whitelistMerchant(9n);
      await expect(
        coupon.connect(backend).createIssuance(9n, 1_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 1),
      ).to.be.revertedWithCustomError(coupon, "NoLimit");
    });

    it("남은 한도를 넘으면 발행할 수 없다", async function () {
      const { coupon, backend } = await withMerchants();
      await expect(coupon.connect(backend).createIssuance(ORCHARD, 10_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 51))
        .to.be.revertedWithCustomError(coupon, "LimitExceeded")
        .withArgs(ORCHARD, 510_000n, 500_000n);
    });

    it("할인액·수량·유효기간이 0이면 거절된다", async function () {
      const { coupon, backend } = await withMerchants();
      for (const [amount, days, qty] of [
        [0n, 14, 1],
        [1_000n, 14, 0],
        [1_000n, 0, 1],
      ]) {
        await expect(
          coupon.connect(backend).createIssuance(ORCHARD, amount, 0n, ReceiveRule.MinAmount, 0n, days, qty),
        ).to.be.revertedWithCustomError(coupon, "InvalidAmount");
      }
    });
  });

  describe("구매 시 기획전 쿠폰", function () {
    it("과수원집에서 사면 봄꽃상회·바다찬 쿠폰 2장이 발급된다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const ids = await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1");

      expect(ids).to.deep.equal([1n, 2n]);
      const c1 = await coupon.couponOf(1n);
      const c2 = await coupon.couponOf(2n);
      expect([c1.merchantId, c2.merchantId]).to.deep.equal([FLOWER, SEA]);
      expect(c1.fromMerchantId).to.equal(ORCHARD);
      expect(c1.amount).to.equal(3_000n);
      expect(c1.minOrder).to.equal(15_000n);
      expect(c1.expiresAt - c1.issuedAt).to.equal(30n * DAY);

      expect(await coupon.balanceOf(alice.address, 1n)).to.equal(1n);
      expect(await coupon.ownerOfCoupon(1n)).to.equal(alice.address);
      expect(await coupon.statusOf(1n)).to.equal(Status.Available);
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).fundReserved).to.equal(3_000n);
    });

    it("발급 이벤트에 주문 번호와 구매 가게가 남는다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const tx = coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, 24_900n, ref("order-1"));
      await expect(tx).to.emit(coupon, "CouponIssued");
      const receipt = await (await tx).wait();
      const ev = receipt.logs.map((l) => coupon.interface.parseLog(l)).find((e) => e?.name === "CouponIssued");
      expect(ev.args.to).to.equal(alice.address);
      expect(ev.args.fromMerchantId).to.equal(ORCHARD);
      expect(ev.args.orderRef).to.equal(ref("order-1"));
    });

    it("KCP 승인 전(서명 단계)에는 기획전 쿠폰이 나오지 않는다", async function () {
      const { coupon, backend, alice } = await withSignedCampaign();
      expect(await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1")).to.deep.equal([]);
    });

    it("기획전에 참여하지 않은 가게에서 사면 기획전 쿠폰이 나오지 않는다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      expect(await buy(coupon, backend, alice, FIELD, 30_000n, "order-1")).to.deep.equal([]);
    });

    it("충전금이 떨어진 가게 쿠폰만 빠지고 나머지는 발급된다 (쏠림 대응)", async function () {
      // 바다찬 충전금 = 쿠폰 1장 분량
      const terms = { ...TERMS, [SEA]: { amount: 3_000n, minOrder: 20_000n, fund: 3_000n } };
      const { coupon, backend, alice, bob } = await withActiveCampaign(terms);

      expect(await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1")).to.have.length(2);

      await expect(coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, bob.address, 24_900n, ref("order-2")))
        .to.emit(coupon, "IssueSkipped")
        .withArgs(ref("order-2"), SEA);
      const ids = await coupon.issuedFor(ref("order-2"));
      expect(ids).to.have.length(1);
      expect((await coupon.couponOf(ids[0])).merchantId).to.equal(FLOWER);
    });

    it("같은 주문으로 두 번 발급할 수 없다 (새로고침 방지)", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1");
      await expect(
        coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, 24_900n, ref("order-1")),
      ).to.be.revertedWithCustomError(coupon, "OrderAlreadyIssued");
    });

    it("기획전 번호 0이면 기획전 쿠폰 없이 구매만 기록된다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      expect(await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1", 0n)).to.deep.equal([]);
      expect(await coupon.hasPurchased(alice.address, ORCHARD)).to.equal(true);
    });
  });

  describe("구매 시 보너스 쿠폰 (가맹점 직접 발행)", function () {
    it("첫 구매 쿠폰은 그 가게 첫 구매 때만 받는다", async function () {
      const { coupon, backend, alice } = await withMerchants();
      await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 5_000n, ReceiveRule.FirstPurchase, 10_000n, 14, 50);

      expect(await coupon.hasPurchased(alice.address, ORCHARD)).to.equal(false);
      const first = await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1", 0n);
      expect(first).to.have.length(1);
      const c = await coupon.couponOf(first[0]);
      expect(c.merchantId).to.equal(ORCHARD); // 산 가게에서 쓰는 쿠폰
      expect(c.issuanceId).to.equal(1n);

      expect(await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-2", 0n)).to.deep.equal([]);
      expect((await coupon.issuanceOf(1n)).issuedCount).to.equal(1n);
    });

    it("받는 조건 금액보다 적게 사면 받지 못한다", async function () {
      const { coupon, backend, alice } = await withMerchants();
      await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 0n, ReceiveRule.MinAmount, 30_000n, 14, 50);
      expect(await buy(coupon, backend, alice, ORCHARD, 29_999n, "order-1", 0n)).to.deep.equal([]);
      expect(await buy(coupon, backend, alice, ORCHARD, 30_000n, "order-2", 0n)).to.have.length(1);
    });

    it("수량이 다 떨어지면 더 발급되지 않는다", async function () {
      const { coupon, backend, alice, bob } = await withMerchants();
      await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 1);
      expect(await buy(coupon, backend, alice, ORCHARD, 10_000n, "order-1", 0n)).to.have.length(1);
      expect(await buy(coupon, backend, bob, ORCHARD, 10_000n, "order-2", 0n)).to.deep.equal([]);
    });

    it("보너스 쿠폰 유효기간은 발행 묶음 기준이다", async function () {
      const { coupon, backend, alice } = await withMerchants();
      await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 5);
      const [id] = await buy(coupon, backend, alice, ORCHARD, 10_000n, "order-1", 0n);
      expect((await coupon.couponOf(id)).expiresAt).to.equal((await coupon.issuanceOf(1n)).expiresAt);
    });

    it("기획전 쿠폰과 보너스 쿠폰을 함께 받을 수 있다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 5_000n, ReceiveRule.FirstPurchase, 10_000n, 14, 50);
      expect(await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1")).to.have.length(3);
    });
  });

  describe("양도 불가", function () {
    it("소비자는 쿠폰을 다른 사람에게 보낼 수 없다", async function () {
      const { coupon, backend, alice, bob } = await withActiveCampaign();
      await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1");
      await expect(
        coupon.connect(alice).safeTransferFrom(alice.address, bob.address, 1n, 1n, "0x"),
      ).to.be.revertedWithCustomError(coupon, "TransferDisabled");
      await expect(
        coupon.connect(alice).safeBatchTransferFrom(alice.address, bob.address, [1n], [1n], "0x"),
      ).to.be.revertedWithCustomError(coupon, "TransferDisabled");
    });

    it("쿠폰 발급은 백엔드만 할 수 있다", async function () {
      const { coupon, alice } = await withActiveCampaign();
      await expect(
        coupon.connect(alice).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, 24_900n, ref("x")),
      ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
    });
  });
});
