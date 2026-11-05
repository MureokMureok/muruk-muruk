// 시연 8장면을 처음부터 끝까지 한 번에 (frontend/README.md "시연 8장면 순서", 11/3) + 발급·사용 락업
// 시작 상태 = seed.js "시연 시작 상태": 기획전 준비 중, 봄꽃상회·바다찬은 조건 등록, 과수원집만 미등록
import { expect } from "chai";
import {
  deploy,
  time,
  ref,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  WILDFLOWER,
  DAY,
  TERMS,
  MerchantStatus,
  CampaignStatus,
  Status,
  Reason,
} from "./helpers.js";

describe("시연 시나리오 전체 (8장면)", function () {
  it("심사 → 조건 등록 → 시작 승인 → 구매 발급 → 쿠폰함 → 사용 → 재사용 거절 → 할인 부담·기록 조회", async function () {
    const { coupon, kcp, backend, alice } = await deploy();
    const op = coupon.connect(backend);
    const asKcp = coupon.connect(kcp);

    // 시작 상태 만들기
    for (const id of [ORCHARD, FLOWER, SEA]) await asKcp.reviewMerchant(id, true);
    const now = BigInt(await time.latest());
    await asKcp.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], now, now + 30n * DAY);
    for (const id of [FLOWER, SEA]) {
      const t = TERMS[id];
      await op.registerTerms(CAMPAIGN, id, t.amount, t.minOrder, t.validity, t.cap);
    }

    // 1 KCP: 들꽃공방 참여 신청 승인
    await asKcp.reviewMerchant(WILDFLOWER, true);
    expect(await coupon.merchantOf(WILDFLOWER)).to.equal(MerchantStatus.Approved);

    // 2 과수원집: 쿠폰 조건 등록 (3/3)
    const t = TERMS[ORCHARD];
    await op.registerTerms(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.validity, t.cap);

    // 3 KCP: 시작 승인 → 진행 중
    await asKcp.setCampaignStatus(CAMPAIGN, CampaignStatus.Active);
    expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Active);

    // 4 지민: 과수원집 감귤 결제 → 다른 가게 쿠폰 2장 (확정 대기) → 구매 확정 → 사용 가능
    await op.issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ref("order-1"));
    const ids = await coupon.issuedFor(ref("order-1"));
    for (const id of ids) expect(await coupon.statusOf(id)).to.equal(Status.Pending);
    await op.confirmPurchase(ref("order-1"));
    const coupons = await Promise.all(ids.map((id) => coupon.couponOf(id)));
    expect(coupons.map((c) => c.merchantId)).to.deep.equal([FLOWER, SEA]);

    // 5 쿠폰함: 2장 모두 사용 가능
    for (const id of ids) expect(await coupon.statusOf(id)).to.equal(Status.Available);

    // 6 봄꽃상회 꽃다발 25,000원 → 결제 시작(쿠폰 잠금) → 결제 확정 → 3,000원 할인 (22,000원 결제), 소각
    const flower = ids[0];
    await op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
    expect(await coupon.statusOf(flower)).to.equal(Status.InUse);
    await op.confirmPayment(ref("pay-1"));
    expect(await coupon.statusOf(flower)).to.equal(Status.Used);
    expect((await coupon.couponOf(flower)).discount).to.equal(3_000n);

    // 7 같은 쿠폰 다시 써보기 → 거절 (쿠폰 상태 변화 없음)
    await expect(op.lockForPayment(flower, alice.address, FLOWER, 25_000n, ref("pay-2")))
      .to.emit(coupon, "RedeemRejected")
      .withArgs(flower, alice.address, FLOWER, Reason.AlreadyUsed, ref("pay-2"));

    // 8 봄꽃상회 할인 부담 = 쓰인 만큼만, KCP 기록 조회
    const f = await coupon.termOf(CAMPAIGN, FLOWER);
    expect([f.issuedCount, f.maxIssue, f.usedCount, f.burden]).to.deep.equal([1n, 100n, 1n, 3_000n]);
    expect((await coupon.termOf(CAMPAIGN, SEA)).burden).to.equal(0n);

    const issued = await coupon.queryFilter(coupon.filters.CouponIssued());
    const used = await coupon.queryFilter(coupon.filters.CouponRedeemed());
    const rejected = await coupon.queryFilter(coupon.filters.RedeemRejected());
    expect([issued.length, used.length, rejected.length]).to.deep.equal([2, 1, 1]);
    expect(used[0].args.orderAmount).to.equal(25_000n); // M4 "쿠폰으로 생긴 매출"
    expect(used[0].args.fromMerchantId).to.equal(ORCHARD); // K2 손님 흐름: 과수원집 → 봄꽃상회
  });
});
