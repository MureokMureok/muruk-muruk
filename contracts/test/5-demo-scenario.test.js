// 시연 흐름 전체를 처음부터 끝까지 한 번에 (frontend/README.md 시연 장면 순서)
import { expect } from "chai";
import { deploy, ref, CAMPAIGN, ORCHARD, FLOWER, SEA, TERMS, ReceiveRule, CampaignStatus, Reason, Status, nextRef } from "./helpers.js";

describe("시연 시나리오 전체", function () {
  it("등록 → 한도 → 기획전 서명·잠금·승인 → 구매 시 쿠폰 발급 → 사용 → 재사용 거절 → 정산", async function () {
    const { coupon, kcp, backend, alice } = await deploy();
    const op = coupon.connect(backend);

    // ① KCP: 가맹점 등록, 입금 확인 → 한도
    for (const id of [ORCHARD, FLOWER, SEA]) {
      await coupon.connect(kcp).whitelistMerchant(id);
      await coupon.connect(kcp).addLimit(id, 500_000n, ref(`deposit-${id}`));
    }
    await coupon.connect(kcp).createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], 30);

    // ② 가맹점: 첫 구매 쿠폰 직접 발행
    await op.createIssuance(ORCHARD, 1_000n, 5_000n, ReceiveRule.FirstPurchase, 10_000n, 14, 50, nextRef());

    // ③ 가맹점 3곳 서명 → 규칙 잠금 → KCP 승인
    for (const id of [ORCHARD, FLOWER, SEA]) {
      const t = TERMS[id];
      await op.signCampaign(CAMPAIGN, id, t.amount, t.minOrder, t.fund);
    }
    expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.PendingApproval);
    await coupon.connect(kcp).decideCampaign(CAMPAIGN, true);

    // ④ 소비자: 과수원집 감귤 24,900원 구매 → 봄꽃상회·바다찬 쿠폰 + 과수원집 첫 구매 쿠폰
    await op.issueForPurchase(CAMPAIGN, ORCHARD, alice.address, 24_900n, ref("order-1"));
    const ids = await coupon.issuedFor(ref("order-1"));
    expect(ids).to.have.length(3);
    const owners = await Promise.all(ids.map((id) => coupon.couponOf(id)));
    expect(owners.map((c) => c.merchantId)).to.deep.equal([FLOWER, SEA, ORCHARD]);

    // ⑥ 소비자: 봄꽃상회 꽃다발 25,000원 → 3,000원 할인, 소각
    const flower = ids[0];
    await op.redeem(flower, alice.address, FLOWER, 25_000n, ref("pay-1"));
    expect(await coupon.statusOf(flower)).to.equal(Status.Used);

    // ⑦ 같은 쿠폰 재사용 → 거절 (쿠폰 상태 변화 없음)
    await expect(op.redeem(flower, alice.address, FLOWER, 25_000n, ref("pay-2")))
      .to.emit(coupon, "RedeemRejected")
      .withArgs(flower, alice.address, Reason.AlreadyUsed, ref("pay-2"));

    // ⑧ 정산·체인 기록
    const flowerTerm = await coupon.termOf(CAMPAIGN, FLOWER);
    expect(flowerTerm.fundReserved).to.equal(3_000n); // 발급된 쿠폰만큼 확보
    expect(flowerTerm.fundUsed).to.equal(3_000n); // 실제 사용 = 봄꽃상회 부담
    expect((await coupon.termOf(CAMPAIGN, SEA)).fundUsed).to.equal(0n);

    const [orchard, orchardRemaining] = await coupon.merchantOf(ORCHARD);
    expect(orchard.reserved).to.equal(200_000n + 50_000n); // 충전금 + 직접 발행분
    expect(orchardRemaining).to.equal(250_000n);
  });
});
