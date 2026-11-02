// 4단계: 쿠폰 사용 — 5가지 검사 → 바로 소각, 거절도 기록, 재사용 거절 (시연 ⑥·⑦, 화면 ⑨-c)
import { expect } from "chai";
import {
  networkHelpers,
  withMerchants,
  withActiveCampaign,
  buy,
  ref,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  ReceiveRule,
  Status,
  Reason,
  nextRef,
} from "./helpers.js";

// 과수원집 구매로 봄꽃상회 쿠폰(1번: 3,000원, 최소 15,000원)과 바다찬 쿠폰(2번)을 받은 상태
async function withCoupons() {
  const ctx = await withActiveCampaign();
  await buy(ctx.coupon, ctx.backend, ctx.alice, ORCHARD, 24_900n, "order-1");
  return { ...ctx, flowerCoupon: 1n, seaCoupon: 2n };
}

/** redeem 결과값(반환)과 실제 실행을 함께 확인 */
async function redeem(coupon, backend, tokenId, owner, merchantId, amount, orderId) {
  const args = [tokenId, owner.address, merchantId, amount, ref(orderId)];
  const result = await coupon.connect(backend).redeem.staticCall(...args);
  const tx = coupon.connect(backend).redeem(...args);
  return { result, tx };
}

describe("4단계 쿠폰 사용", function () {
  it("봄꽃상회에서 25,000원 결제 시 3,000원 할인되고 쿠폰은 소각된다", async function () {
    const { coupon, backend, alice, flowerCoupon } = await withCoupons();
    const { result, tx } = await redeem(coupon, backend, flowerCoupon, alice, FLOWER, 25_000n, "pay-1");

    expect(result.ok).to.equal(true);
    expect(result.reason).to.equal(Reason.Ok);
    expect(result.discount).to.equal(3_000n);
    await expect(tx)
      .to.emit(coupon, "CouponRedeemed")
      .withArgs(flowerCoupon, FLOWER, alice.address, 3_000n, ref("pay-1"));

    expect(await coupon.balanceOf(alice.address, flowerCoupon)).to.equal(0n);
    expect(await coupon.statusOf(flowerCoupon)).to.equal(Status.Used);
    const c = await coupon.couponOf(flowerCoupon);
    expect(c.used).to.equal(true);
    expect(c.usedAt).to.be.greaterThan(0n);
    // 소각 뒤에도 누가 받았던 쿠폰인지 기록은 남는다
    expect(await coupon.ownerOfCoupon(flowerCoupon)).to.equal(alice.address);
    // 정산: 봄꽃상회 충전금에서 3,000원 사용
    expect((await coupon.termOf(CAMPAIGN, FLOWER)).fundUsed).to.equal(3_000n);
  });

  it("이미 쓴 쿠폰은 거절되고, 거절 기록이 남는다", async function () {
    const { coupon, backend, alice, flowerCoupon } = await withCoupons();
    await coupon.connect(backend).redeem(flowerCoupon, alice.address, FLOWER, 25_000n, ref("pay-1"));

    const { result, tx } = await redeem(coupon, backend, flowerCoupon, alice, FLOWER, 25_000n, "pay-2");
    expect(result.ok).to.equal(false);
    expect(result.reason).to.equal(Reason.AlreadyUsed);
    expect(result.discount).to.equal(0n);
    await expect(tx)
      .to.emit(coupon, "RedeemRejected")
      .withArgs(flowerCoupon, alice.address, Reason.AlreadyUsed, ref("pay-2"));
    // 정산 금액은 그대로
    expect((await coupon.termOf(CAMPAIGN, FLOWER)).fundUsed).to.equal(3_000n);
  });

  it("남의 쿠폰이나 없는 쿠폰은 '내 쿠폰인가'에서 거절된다", async function () {
    const { coupon, backend, bob, flowerCoupon } = await withCoupons();
    expect((await redeem(coupon, backend, flowerCoupon, bob, FLOWER, 25_000n, "pay-1")).result.reason).to.equal(
      Reason.NotOwner,
    );
    expect((await redeem(coupon, backend, 999n, bob, FLOWER, 25_000n, "pay-2")).result.reason).to.equal(
      Reason.NotOwner,
    );
  });

  it("다른 가게에서는 쓸 수 없다", async function () {
    const { coupon, backend, alice, flowerCoupon } = await withCoupons();
    const { result } = await redeem(coupon, backend, flowerCoupon, alice, SEA, 25_000n, "pay-1");
    expect(result.reason).to.equal(Reason.WrongMerchant);
  });

  it("최소 주문 금액보다 적으면 쓸 수 없다", async function () {
    const { coupon, backend, alice, flowerCoupon } = await withCoupons();
    const { result } = await redeem(coupon, backend, flowerCoupon, alice, FLOWER, 14_999n, "pay-1");
    expect(result.reason).to.equal(Reason.BelowMinOrder);
    // 거절돼도 쿠폰은 그대로 사용 가능
    expect(await coupon.statusOf(flowerCoupon)).to.equal(Status.Available);
  });

  it("받은 지 30일이 지나면 만료되어 쓸 수 없다", async function () {
    const { coupon, backend, alice, flowerCoupon } = await withCoupons();
    const { expiresAt } = await coupon.couponOf(flowerCoupon);

    await networkHelpers.time.increaseTo(expiresAt); // 마지막 순간까지는 사용 가능
    expect(await coupon.check(flowerCoupon, alice.address, FLOWER, 25_000n)).to.equal(Reason.Ok);

    await networkHelpers.time.increaseTo(expiresAt + 1n);
    expect(await coupon.statusOf(flowerCoupon)).to.equal(Status.Expired);
    const { result } = await redeem(coupon, backend, flowerCoupon, alice, FLOWER, 25_000n, "pay-1");
    expect(result.reason).to.equal(Reason.Expired);
  });

  it("검사 순서는 화면 ⑨-c와 같다 (여러 개 틀리면 앞 항목으로 거절)", async function () {
    const { coupon, alice, bob, flowerCoupon } = await withCoupons();
    // 남의 쿠폰 + 다른 가게 + 금액 부족 → '내 쿠폰인가'
    expect(await coupon.check(flowerCoupon, bob.address, SEA, 1n)).to.equal(Reason.NotOwner);
    // 다른 가게 + 금액 부족 → '쓸 수 있는 가게인가'
    expect(await coupon.check(flowerCoupon, alice.address, SEA, 1n)).to.equal(Reason.WrongMerchant);
  });

  it("checkAll은 5가지 검사 결과를 항목별로 돌려준다", async function () {
    const { coupon, alice, flowerCoupon } = await withCoupons();
    const r = await coupon.checkAll(flowerCoupon, alice.address, FLOWER, 10_000n);
    expect([r.isOwner, r.merchantOk, r.inPeriod, r.minOrderOk, r.unused]).to.deep.equal([true, true, true, false, true]);

    const none = await coupon.checkAll(999n, alice.address, FLOWER, 25_000n);
    expect([...none]).to.deep.equal([false, false, false, false, false]);
    expect(await coupon.statusOf(999n)).to.equal(Status.None);
  });

  it("보너스 쿠폰을 쓰면 발행 묶음의 사용 수량·금액이 늘어난다", async function () {
    const { coupon, backend, alice } = await withMerchants();
    await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 5_000n, ReceiveRule.FirstPurchase, 10_000n, 14, 50, nextRef());
    const [id] = await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1", 0n);

    await coupon.connect(backend).redeem(id, alice.address, ORCHARD, 12_000n, ref("pay-1"));
    const s = await coupon.issuanceOf(1n);
    expect(s.usedCount).to.equal(1n);
    expect(s.usedAmount).to.equal(1_000n);
  });

  it("할인액이 주문 금액보다 크면 주문 금액까지만 할인된다", async function () {
    const { coupon, backend, alice } = await withMerchants();
    await coupon.connect(backend).createIssuance(ORCHARD, 5_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 1, nextRef());
    const [id] = await buy(coupon, backend, alice, ORCHARD, 10_000n, "order-1", 0n);

    const { result } = await redeem(coupon, backend, id, alice, ORCHARD, 3_000n, "pay-1");
    expect(result.discount).to.equal(3_000n);
  });

  it("쿠폰 사용 처리는 백엔드만 할 수 있다", async function () {
    const { coupon, alice, flowerCoupon } = await withCoupons();
    await expect(
      coupon.connect(alice).redeem(flowerCoupon, alice.address, FLOWER, 25_000n, ref("pay-1")),
    ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
  });
});
