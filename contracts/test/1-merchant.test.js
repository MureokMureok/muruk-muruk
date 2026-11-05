// 1단계: 가맹점 심사 (KCP K1 · 모의 API reviewMerchant)
import { expect } from "chai";
import { deploy, ORCHARD, WILDFLOWER, MerchantStatus } from "./helpers.js";

describe("1단계 가맹점 심사", function () {
  it("KCP가 승인하면 승인 상태가 되고 기록이 남는다", async function () {
    const { coupon } = await deploy();
    expect(await coupon.merchantOf(ORCHARD)).to.equal(MerchantStatus.None);

    await expect(coupon.reviewMerchant(ORCHARD, true)).to.emit(coupon, "MerchantReviewed").withArgs(ORCHARD, true);
    expect(await coupon.merchantOf(ORCHARD)).to.equal(MerchantStatus.Approved);
  });

  it("KCP가 반려하면 반려 상태가 되고 기록이 남는다", async function () {
    const { coupon } = await deploy();
    await expect(coupon.reviewMerchant(WILDFLOWER, false))
      .to.emit(coupon, "MerchantReviewed")
      .withArgs(WILDFLOWER, false);
    expect(await coupon.merchantOf(WILDFLOWER)).to.equal(MerchantStatus.Rejected);
  });

  it("이미 심사한 가게는 다시 심사할 수 없다 (NOT_PENDING)", async function () {
    const { coupon } = await deploy();
    await coupon.reviewMerchant(ORCHARD, true);
    await expect(coupon.reviewMerchant(ORCHARD, false)).to.be.revertedWithCustomError(coupon, "NotPending").withArgs(ORCHARD);

    await coupon.reviewMerchant(WILDFLOWER, false);
    await expect(coupon.reviewMerchant(WILDFLOWER, true)).to.be.revertedWithCustomError(coupon, "NotPending");
  });

  it("심사는 KCP만 할 수 있다", async function () {
    const { coupon, backend, alice } = await deploy();
    for (const who of [backend, alice]) {
      await expect(coupon.connect(who).reviewMerchant(ORCHARD, true)).to.be.revertedWithCustomError(
        coupon,
        "AccessControlUnauthorizedAccount",
      );
    }
  });
});
