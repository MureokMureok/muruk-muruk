// 4단계: 쿠폰 사용 + 사용 락업 · 주문당 1장 · 재사용 거절 · 할인 부담
// (소비자 ⑦ ⑧ ⑨ · 가맹점 M4 · 모의 API doRedeem · KCP 미팅 "락업: 결제 시작 → 잠금 → 확정 시 소각 / 취소 시 복원")
import { expect } from "chai";
import {
  withActiveCampaign,
  buyConfirmed,
  use,
  ref,
  time,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  TERMS,
  CampaignStatus,
  Status,
  Reason,
  PaymentStatus,
} from "./helpers.js";

/** 과수원집 구매(확정)로 받은 봄꽃상회·바다찬 쿠폰 준비 */
async function coupons(terms = TERMS) {
  const ctx = await withActiveCampaign(terms);
  const ids = await buyConfirmed(ctx.coupon, ctx.backend, ctx.alice, ORCHARD, "order-1");
  ctx.flower = ids[0];
  ctx.sea = ids[1];
  ctx.op = ctx.coupon.connect(ctx.backend);
  return ctx;
}

describe("4단계 쿠폰 사용", function () {
  describe("사용 락업 (결제 시작 → 잠금 → 확정 / 취소)", function () {
    it("결제 시작하면 쿠폰이 잠기고(결제 중), 확정하면 3,000원 할인·소각된다", async function () {
      const { coupon, op, alice, flower } = await coupons();
      const [ok, reason] = await op.lockForPayment.staticCall(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      expect([ok, reason]).to.deep.equal([true, Reason.Ok]);

      await expect(op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1")))
        .to.emit(coupon, "CouponLocked")
        .withArgs(flower, FLOWER, alice.address, 25_000n, ref("pay-1"));
      expect(await coupon.statusOf(flower)).to.equal(Status.InUse);
      expect(await coupon.balanceOf(alice.address, flower)).to.equal(1n); // 아직 소각 안 함
      const p = await coupon.paymentOf(ref("pay-1"));
      expect([p.status, p.tokenId, p.merchantId, p.orderAmount]).to.deep.equal([PaymentStatus.Locked, flower, FLOWER, 25_000n]);

      expect(await op.confirmPayment.staticCall(ref("pay-1"))).to.equal(3_000n);
      await expect(op.confirmPayment(ref("pay-1")))
        .to.emit(coupon, "CouponRedeemed")
        .withArgs(flower, FLOWER, alice.address, ORCHARD, 3_000n, 25_000n, ref("pay-1"));

      expect(await coupon.statusOf(flower)).to.equal(Status.Used);
      expect(await coupon.balanceOf(alice.address, flower)).to.equal(0n);
      expect(await coupon.ownerOfCoupon(flower)).to.equal(alice.address); // 기록은 남음
      const c = await coupon.couponOf(flower);
      expect(c.discount).to.equal(3_000n);
      expect((await coupon.paymentOf(ref("pay-1"))).status).to.equal(PaymentStatus.Confirmed);
    });

    it("결제 취소하면 쿠폰이 사용 가능으로 돌아오고(⑨-d), 다시 쓸 수 있다", async function () {
      const { coupon, op, alice, flower } = await coupons();
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      await expect(op.cancelPayment(ref("pay-1")))
        .to.emit(coupon, "CouponUnlocked")
        .withArgs(flower, ref("pay-1"));
      expect(await coupon.statusOf(flower)).to.equal(Status.Available);
      expect((await coupon.paymentOf(ref("pay-1"))).status).to.equal(PaymentStatus.Cancelled);
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).burden).to.equal(0n);

      // 같은 결제 번호로 다시 결제 시도 가능 (취소된 결제)
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      await op.confirmPayment(ref("pay-1"));
      expect(await coupon.statusOf(flower)).to.equal(Status.Used);
    });

    it("잠긴 쿠폰은 다른 결제에 쓸 수 없다 (InUse, 중복 사용 방지)", async function () {
      const { coupon, op, alice, flower } = await coupons();
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      expect(await coupon.check(flower, alice.address, FLOWER, 25_000n)).to.equal(Reason.InUse);
      await expect(op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-2")))
        .to.emit(coupon, "RedeemRejected")
        .withArgs(flower, alice.address, FLOWER, Reason.InUse, ref("pay-2"));
    });

    it("잠긴 뒤 유효기간이 지나도 그 결제는 확정할 수 있다", async function () {
      const { coupon, op, alice, flower } = await coupons();
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      await time.increaseTo((await coupon.couponOf(flower)).expiresAt + 1n);
      expect(await coupon.statusOf(flower)).to.equal(Status.InUse);
      await op.confirmPayment(ref("pay-1"));
      expect(await coupon.statusOf(flower)).to.equal(Status.Used);
    });

    it("결제 확정·취소는 결제 중일 때만 (PaymentNotLocked)", async function () {
      const { coupon, op, alice, flower } = await coupons();
      for (const fn of ["confirmPayment", "cancelPayment"]) {
        await expect(op[fn](ref("no-pay")))
          .to.be.revertedWithCustomError(coupon, "PaymentNotLocked")
          .withArgs(ref("no-pay"));
      }
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      await op.confirmPayment(ref("pay-1"));
      for (const fn of ["confirmPayment", "cancelPayment"]) {
        await expect(op[fn](ref("pay-1"))).to.be.revertedWithCustomError(coupon, "PaymentNotLocked");
      }
    });

    it("결제 번호 0은 거절된다", async function () {
      const { coupon, op, alice, flower } = await coupons();
      await expect(
        op.lockForPayment(flower, alice.address, FLOWER, 25_000n, "0x" + "00".repeat(32)),
      ).to.be.revertedWithCustomError(coupon, "InvalidRef");
    });

    it("잠금·확정·취소는 백엔드만 할 수 있다", async function () {
      const { coupon, op, kcp, alice, flower } = await coupons();
      for (const who of [kcp, alice]) {
        await expect(
          coupon.connect(who).lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("p")),
        ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
      }
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      for (const who of [kcp, alice]) {
        for (const fn of ["confirmPayment", "cancelPayment"]) {
          await expect(coupon.connect(who)[fn](ref("pay-1"))).to.be.revertedWithCustomError(
            coupon,
            "AccessControlUnauthorizedAccount",
          );
        }
      }
    });
  });

  describe("주문당 쿠폰 1장", function () {
    it("한 결제에 쿠폰이 잠긴 뒤에는 같은 결제 번호로 두 번째 쿠폰을 잠글 수 없다", async function () {
      // 같은 가게(봄꽃상회) 쿠폰 2장을 가진 소비자
      const ctx = await coupons();
      const { coupon, op, backend, alice, flower } = ctx;
      const [flower2] = await buyConfirmed(coupon, backend, alice, ORCHARD, "order-2");

      await op.lockForPayment(flower, alice.address, FLOWER, 50_000n, ref("pay-1"));
      await expect(op.lockForPayment(flower2, alice.address, FLOWER, 50_000n, ref("pay-1")))
        .to.be.revertedWithCustomError(coupon, "PaymentExists")
        .withArgs(ref("pay-1"));

      // 확정된 결제 번호도 다시 못 씀
      await op.confirmPayment(ref("pay-1"));
      await expect(op.lockForPayment(flower2, alice.address, FLOWER, 50_000n, ref("pay-1"))).to.be.revertedWithCustomError(
        coupon,
        "PaymentExists",
      );
      expect(await coupon.statusOf(flower2)).to.equal(Status.Available);
    });

    it("잠금이 거절된 결제 번호로는 다른 쿠폰을 쓸 수 있다 (거절은 결제를 차지하지 않음)", async function () {
      const { coupon, op, alice, flower, sea } = await coupons();
      await op.lockForPayment(sea, alice.address, FLOWER, 25_000n, ref("pay-1")); // 다른 가게 쿠폰 → 거절
      expect((await coupon.paymentOf(ref("pay-1"))).status).to.equal(PaymentStatus.None);
      await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
      expect(await coupon.statusOf(flower)).to.equal(Status.InUse);
    });
  });

  describe("사용 검사 (⑨-c)", function () {
    it("할인 부담은 쓰인 쿠폰만큼 사용처 가게에 쌓인다 (M4)", async function () {
      const { coupon, backend, alice, flower } = await coupons();
      await use(coupon, backend, flower, alice, FLOWER, 25_000n, "pay-1");
      const f = await coupon.termOf(CAMPAIGN, FLOWER);
      expect([f.usedCount, f.burden]).to.deep.equal([1n, 3_000n]);
      const s = await coupon.termOf(CAMPAIGN, SEA); // 발급만 되고 안 쓰인 바다찬은 부담 0
      expect([s.issuedCount, s.burden]).to.deep.equal([1n, 0n]);
    });

    it("이미 쓴 쿠폰은 거절되고, 거절 기록이 남으며 상태는 그대로다", async function () {
      const { coupon, op, backend, alice, flower } = await coupons();
      await use(coupon, backend, flower, alice, FLOWER, 25_000n, "pay-1");

      const [ok, reason] = await op.lockForPayment.staticCall(flower, alice.address, FLOWER, 25_000n, ref("pay-2"));
      expect([ok, reason]).to.deep.equal([false, Reason.AlreadyUsed]);
      await expect(op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-2")))
        .to.emit(coupon, "RedeemRejected")
        .withArgs(flower, alice.address, FLOWER, Reason.AlreadyUsed, ref("pay-2"));
      expect(await coupon.statusOf(flower)).to.equal(Status.Used);
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).burden).to.equal(3_000n); // 두 번 쌓이지 않음
    });

    it("다른 가게에서 쓰려다 거절되면 시도한 가게 번호가 기록된다 (M1 최근 기록)", async function () {
      const { coupon, op, alice, flower } = await coupons();
      await expect(op.lockForPayment(flower, alice.address, SEA, 25_000n, ref("pay-x")))
        .to.emit(coupon, "RedeemRejected")
        .withArgs(flower, alice.address, SEA, Reason.WrongMerchant, ref("pay-x"));
    });

    it("남의 쿠폰이나 없는 쿠폰은 '내 쿠폰인가'에서 거절된다", async function () {
      const { coupon, alice, bob, flower } = await coupons();
      expect(await coupon.check(flower, bob.address, FLOWER, 25_000n)).to.equal(Reason.NotOwner);
      expect(await coupon.check(999n, alice.address, FLOWER, 25_000n)).to.equal(Reason.NotOwner);
    });

    it("최소 주문 금액보다 적으면 쓸 수 없고, 같으면 쓸 수 있다", async function () {
      const { coupon, alice, flower } = await coupons();
      expect(await coupon.check(flower, alice.address, FLOWER, 14_999n)).to.equal(Reason.BelowMinOrder);
      expect(await coupon.check(flower, alice.address, FLOWER, 15_000n)).to.equal(Reason.Ok);
    });

    it("실제 거래: 만료 시각 정각에는 잠기고, 1초 뒤에는 Expired로 거절", async function () {
      const { coupon, op, alice, flower, sea } = await coupons();
      const { expiresAt } = await coupon.couponOf(flower);
      expect((await coupon.couponOf(sea)).expiresAt).to.equal(expiresAt); // 같은 블록에서 발급

      await time.setNextBlockTimestamp(expiresAt);
      await expect(op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"))).to.emit(coupon, "CouponLocked");

      await time.setNextBlockTimestamp(expiresAt + 1n);
      await expect(op.lockForPayment(sea, alice.address, SEA, 21_900n, ref("pay-2")))
        .to.emit(coupon, "RedeemRejected")
        .withArgs(sea, alice.address, SEA, Reason.Expired, ref("pay-2"));
      expect(await coupon.statusOf(sea)).to.equal(Status.Expired);
    });

    it("일시 중지·종료된 기획전 쿠폰도 유효기간 안이면 쓸 수 있다", async function () {
      const { coupon, backend, alice, flower, sea } = await coupons();
      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Paused);
      expect(await coupon.check(flower, alice.address, FLOWER, 25_000n)).to.equal(Reason.Ok);

      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Ended);
      await use(coupon, backend, sea, alice, SEA, 21_900n, "pay-1");
      expect(await coupon.statusOf(sea)).to.equal(Status.Used);
    });

    it("검사 순서 앞부분: 내 쿠폰인가 → 쓸 수 있는 가게인가", async function () {
      const { coupon, alice, bob, flower } = await coupons();
      expect(await coupon.check(flower, bob.address, SEA, 1n)).to.equal(Reason.NotOwner);
      expect(await coupon.check(flower, alice.address, SEA, 1n)).to.equal(Reason.WrongMerchant);
    });

    it("검사 순서 뒷부분: 유효기간 → 최소 주문 → 미사용 → 결제 중", async function () {
      const { coupon, op, backend, alice, flower, sea } = await coupons();
      await op.lockForPayment(sea, alice.address, SEA, 21_900n, ref("pay-s"));
      expect(await coupon.check(sea, alice.address, SEA, 21_900n)).to.equal(Reason.InUse);
      expect(await coupon.check(sea, alice.address, SEA, 1n)).to.equal(Reason.BelowMinOrder); // 결제 중 + 금액 미달

      await use(coupon, backend, flower, alice, FLOWER, 25_000n, "pay-1");
      expect(await coupon.check(flower, alice.address, FLOWER, 25_000n)).to.equal(Reason.AlreadyUsed);
      expect(await coupon.check(flower, alice.address, FLOWER, 1n)).to.equal(Reason.BelowMinOrder); // 사용됨 + 금액 미달

      await time.increaseTo((await coupon.couponOf(flower)).expiresAt + 1n);
      expect(await coupon.check(flower, alice.address, FLOWER, 1n)).to.equal(Reason.Expired); // 사용됨 + 금액 미달 + 만료
    });

    it("checkAll은 5가지 검사 결과를 항목별로 돌려준다", async function () {
      const { coupon, alice, flower } = await coupons();
      const r = await coupon.checkAll(flower, alice.address, FLOWER, 10_000n);
      expect([...r]).to.deep.equal([true, true, true, false, true]);
      expect([...(await coupon.checkAll(999n, alice.address, FLOWER, 25_000n))]).to.deep.equal([
        false,
        false,
        false,
        false,
        false,
      ]);
    });
  });
});
