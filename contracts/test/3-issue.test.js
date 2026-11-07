// 3단계: 구매 시 쿠폰 발급 + 발급 락업 (소비자 ③ ④ · 모의 API couponsForPurchase · 공동구매 설계안 "결제 때 잠김 발급 → 구매 확정 후 해제")
import { expect } from "chai";
import {
  withTerms,
  withActiveCampaign,
  buy,
  buyConfirmed,
  ref,
  time,
  days30From,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  WILDFLOWER,
  DAY,
  TERMS,
  CampaignStatus,
  Validity,
  Status,
  Reason,
  OrderStatus,
} from "./helpers.js";

describe("3단계 쿠폰 발급", function () {
  it("과수원집에서 사면 봄꽃상회·바다찬 쿠폰 2장, 과수원집 쿠폰은 받지 않는다", async function () {
    const { coupon, backend, alice } = await withActiveCampaign();
    const ids = await buy(coupon, backend, alice, ORCHARD, "order-1");
    expect(ids).to.have.length(2);

    const [flower, sea] = await Promise.all(ids.map((id) => coupon.couponOf(id)));
    expect(flower.merchantId).to.equal(FLOWER);
    expect(flower.amount).to.equal(3_000n);
    expect(flower.minOrder).to.equal(15_000n);
    expect(flower.fromMerchantId).to.equal(ORCHARD); // 어디서 온 손님 (M4)
    expect(flower.campaignId).to.equal(CAMPAIGN);
    expect(flower.orderRef).to.equal(ref("order-1"));
    expect(sea.merchantId).to.equal(SEA);

    for (const id of ids) {
      expect(await coupon.balanceOf(alice.address, id)).to.equal(1n);
      expect(await coupon.ownerOfCoupon(id)).to.equal(alice.address);
    }
    expect((await coupon.termOf(CAMPAIGN, FLOWER)).issuedCount).to.equal(1n);
    expect((await coupon.termOf(CAMPAIGN, ORCHARD)).issuedCount).to.equal(0n);
  });

  it("발급마다 기록(CouponIssued)이 남는다", async function () {
    const { coupon, backend, alice } = await withActiveCampaign();
    await coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ref("order-1"));
    const logs = await coupon.queryFilter(coupon.filters.CouponIssued());
    expect(logs.map((l) => l.args.merchantId)).to.deep.equal([FLOWER, SEA]);
    expect(logs[0].args.orderRef).to.equal(ref("order-1"));
    expect(logs[0].args.fromMerchantId).to.equal(ORCHARD);
    expect(logs[0].args.campaignId).to.equal(CAMPAIGN);
    expect(logs[0].args.to).to.equal(alice.address);
    expect(logs[0].args.expiresAt).to.equal((await coupon.couponOf(logs[0].args.tokenId)).expiresAt);
  });

  describe("발급 락업 (구매 확정 전에는 못 씀)", function () {
    it("발급 직후에는 확정 대기 — 사용 검사에서 NotConfirmed", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const [flower] = await buy(coupon, backend, alice, ORCHARD, "order-1");
      expect(await coupon.statusOf(flower)).to.equal(Status.Pending);
      expect(await coupon.check(flower, alice.address, FLOWER, 25_000n)).to.equal(Reason.NotConfirmed);
      const order = await coupon.orderOf(ref("order-1"));
      expect([order.status, order.campaignId, order.buyer]).to.deep.equal([OrderStatus.Pending, CAMPAIGN, alice.address]);
    });

    it("구매 확정하면 그 주문의 쿠폰이 모두 사용 가능해지고 기록이 남는다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const ids = await buy(coupon, backend, alice, ORCHARD, "order-1");
      await expect(coupon.connect(backend).confirmPurchase(ref("order-1")))
        .to.emit(coupon, "PurchaseConfirmed")
        .withArgs(ref("order-1"), 2n)
        .and.to.emit(coupon, "CouponActivated");
      for (const id of ids) expect(await coupon.statusOf(id)).to.equal(Status.Available);
      expect(await coupon.check(ids[0], alice.address, FLOWER, 25_000n)).to.equal(Reason.Ok);
      expect((await coupon.orderOf(ref("order-1"))).status).to.equal(OrderStatus.Confirmed);
    });

    it("유효기간은 발급일 기준 그대로 — 확정이 늦어도 바뀌지 않는다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const [flower] = await buy(coupon, backend, alice, ORCHARD, "order-1");
      const before = (await coupon.couponOf(flower)).expiresAt;
      await time.increase(5n * DAY);
      await coupon.connect(backend).confirmPurchase(ref("order-1"));
      const c = await coupon.couponOf(flower);
      expect(c.expiresAt).to.equal(before);
      expect(c.expiresAt).to.equal(days30From(c.issuedAt));
    });

    it("확정 전에 유효기간이 지나면 확정 직후 바로 만료 상태", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const [flower] = await buy(coupon, backend, alice, ORCHARD, "order-1");
      await time.increaseTo((await coupon.couponOf(flower)).expiresAt + 1n);
      await coupon.connect(backend).confirmPurchase(ref("order-1"));
      expect(await coupon.statusOf(flower)).to.equal(Status.Expired);
    });

    it("구매 취소(확정 전 환불)하면 쿠폰은 무효·소각되고 그 가게 발급 수가 돌아온다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const ids = await buy(coupon, backend, alice, ORCHARD, "order-1");
      await expect(coupon.connect(backend).cancelPurchase(ref("order-1")))
        .to.emit(coupon, "PurchaseCancelled")
        .withArgs(ref("order-1"), 2n)
        .and.to.emit(coupon, "CouponVoided");

      for (const id of ids) {
        expect(await coupon.statusOf(id)).to.equal(Status.Voided);
        expect(await coupon.balanceOf(alice.address, id)).to.equal(0n);
        expect(await coupon.ownerOfCoupon(id)).to.equal(alice.address); // 기록은 남음
      }
      expect(await coupon.check(ids[0], alice.address, FLOWER, 25_000n)).to.equal(Reason.Voided);
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).issuedCount).to.equal(0n);
      expect((await coupon.orderOf(ref("order-1"))).status).to.equal(OrderStatus.Cancelled);
    });

    it("취소로 돌아온 발급 수는 다른 손님에게 다시 나갈 수 있다", async function () {
      // 봄꽃상회 최대 1장
      const terms = { ...TERMS, [FLOWER]: { ...TERMS[FLOWER], cap: 3_000n } };
      const { coupon, backend, alice, bob } = await withActiveCampaign(terms);
      await buy(coupon, backend, alice, ORCHARD, "order-1");
      expect(await buy(coupon, backend, bob, ORCHARD, "order-2")).to.have.length(1); // 바다찬만
      await coupon.connect(backend).cancelPurchase(ref("order-1"));
      const again = await buy(coupon, backend, bob, ORCHARD, "order-3");
      expect((await coupon.couponOf(again[0])).merchantId).to.equal(FLOWER);
    });

    it("확정·취소는 확정 대기 주문에서 한 번만 (OrderNotPending)", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      const op = coupon.connect(backend);
      await buy(coupon, backend, alice, ORCHARD, "order-1");
      await op.confirmPurchase(ref("order-1"));
      for (const fn of ["confirmPurchase", "cancelPurchase"]) {
        await expect(op[fn](ref("order-1")))
          .to.be.revertedWithCustomError(coupon, "OrderNotPending")
          .withArgs(ref("order-1"));
      }
      await buy(coupon, backend, alice, ORCHARD, "order-2");
      await op.cancelPurchase(ref("order-2"));
      await expect(op.confirmPurchase(ref("order-2"))).to.be.revertedWithCustomError(coupon, "OrderNotPending");
      await expect(op.confirmPurchase(ref("no-order"))).to.be.revertedWithCustomError(coupon, "OrderNotPending");
    });

    it("구매 확정 후 환불은 이 컨트랙트 범위 밖 — 확정된 주문은 취소할 수 없다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      await buyConfirmed(coupon, backend, alice, ORCHARD, "order-1");
      await expect(coupon.connect(backend).cancelPurchase(ref("order-1"))).to.be.revertedWithCustomError(
        coupon,
        "OrderNotPending",
      );
    });

    it("구매 확정·취소는 백엔드만 할 수 있다", async function () {
      const { coupon, backend, kcp, alice } = await withActiveCampaign();
      await buy(coupon, backend, alice, ORCHARD, "order-1");
      for (const who of [kcp, alice]) {
        for (const fn of ["confirmPurchase", "cancelPurchase"]) {
          await expect(coupon.connect(who)[fn](ref("order-1"))).to.be.revertedWithCustomError(
            coupon,
            "AccessControlUnauthorizedAccount",
          );
        }
      }
    });
  });

  it("유효기간 '받은 날부터 30일'은 30일째 되는 날 23:59:59(KST)까지", async function () {
    const { coupon, backend, alice } = await withActiveCampaign();
    const [id] = await buy(coupon, backend, alice, ORCHARD, "order-1");
    const c = await coupon.couponOf(id);
    expect(c.expiresAt).to.equal(days30From(c.issuedAt));
  });

  // 공식을 다시 쓰지 않고 정답을 직접 적어서 검사 (KST 날짜 경계: 23:59:59 발급 / 00:00:00 발급)
  // 테스트끼리 체인 시간을 공유하므로 날짜는 앞 테스트보다 늦게 둔다
  const utc = (s) => BigInt(Date.parse(s) / 1000);
  for (const [issued, expected, label] of [
    ["2030-03-10T14:59:59Z", "2030-04-09T14:59:59Z", "3/10 23:59:59 KST 발급 → 4/9 23:59:59 KST"],
    ["2030-05-20T15:00:00Z", "2030-06-20T14:59:59Z", "5/21 00:00:00 KST 발급 → 6/20 23:59:59 KST"],
  ]) {
    it(`30일 만료 정답 확인: ${label}`, async function () {
      const { coupon, backend, alice } = await withActiveCampaign(TERMS, { endsAt: utc("2031-01-01T00:00:00Z") });
      await time.setNextBlockTimestamp(utc(issued));
      const [id] = await buy(coupon, backend, alice, ORCHARD, "order-1");
      const c = await coupon.couponOf(id);
      expect(c.issuedAt).to.equal(utc(issued));
      expect(c.expiresAt).to.equal(utc(expected));
    });
  }

  it("유효기간 '기획전 종료일까지'면 기획전 종료 시각이 만료 시각이 된다", async function () {
    const terms = { ...TERMS, [FLOWER]: { ...TERMS[FLOWER], validity: Validity.CampaignEnd } };
    const { coupon, backend, alice, endsAt } = await withActiveCampaign(terms);
    const ids = await buy(coupon, backend, alice, ORCHARD, "order-1");
    expect((await coupon.couponOf(ids[0])).expiresAt).to.equal(endsAt);
    const sea = await coupon.couponOf(ids[1]); // 바다찬은 받은 날부터 30일 그대로
    expect(sea.expiresAt).to.equal(days30From(sea.issuedAt));
  });

  it("할인 한도까지 다 발급된 가게 쿠폰만 빠지고 기록이 남는다 (④-c '모두 소진')", async function () {
    // 봄꽃상회 한도 6,000원 → 최대 2장
    const terms = { ...TERMS, [FLOWER]: { ...TERMS[FLOWER], cap: 6_000n } };
    const { coupon, backend, alice, bob } = await withActiveCampaign(terms);

    await buy(coupon, backend, alice, ORCHARD, "order-1");
    await buy(coupon, backend, bob, SEA, "order-2");

    const orderRef = ref("order-3");
    await expect(coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, orderRef))
      .to.emit(coupon, "IssueSkipped")
      .withArgs(orderRef, FLOWER);

    const ids = await coupon.issuedFor(orderRef);
    expect(ids).to.have.length(1); // 바다찬 1장만
    expect((await coupon.couponOf(ids[0])).merchantId).to.equal(SEA);

    const t = await coupon.termOf(CAMPAIGN, FLOWER);
    expect(t.issuedCount).to.equal(2n);
    expect(t.maxIssue).to.equal(2n);
  });

  it("같은 주문으로 두 번 발급할 수 없다 (새로고침·재요청 방지)", async function () {
    const { coupon, backend, alice } = await withActiveCampaign();
    await buy(coupon, backend, alice, ORCHARD, "order-1");
    await expect(coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ref("order-1")))
      .to.be.revertedWithCustomError(coupon, "OrderAlreadyIssued")
      .withArgs(ref("order-1"));
  });

  it("같은 소비자가 다시 사면 또 받는다 (구매할 때마다)", async function () {
    const { coupon, backend, alice } = await withActiveCampaign();
    await buy(coupon, backend, alice, ORCHARD, "order-1");
    const again = await buy(coupon, backend, alice, ORCHARD, "order-2");
    expect(again).to.have.length(2);
    expect((await coupon.termOf(CAMPAIGN, FLOWER)).issuedCount).to.equal(2n);
  });

  it("준비 중·일시 중지·종료된 기획전에서는 쿠폰이 나오지 않는다 (주문은 기록됨)", async function () {
    const ctx = await withTerms();
    const { coupon, backend, alice } = ctx;
    expect(await buy(coupon, backend, alice, ORCHARD, "o-preparing")).to.have.length(0);

    await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Active);
    await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Paused);
    expect(await buy(coupon, backend, alice, ORCHARD, "o-paused")).to.have.length(0);

    await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Active);
    expect(await buy(coupon, backend, alice, ORCHARD, "o-active")).to.have.length(2);

    await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Ended);
    expect(await buy(coupon, backend, alice, ORCHARD, "o-ended")).to.have.length(0);

    // 쿠폰이 안 나간 주문도 같은 번호로 다시 부를 수 없다
    await expect(
      coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ref("o-paused")),
    ).to.be.revertedWithCustomError(coupon, "OrderAlreadyIssued");
  });

  it("종료 시각이 지나면 KCP가 종료하지 않아도 발급이 멈춘다 (K2 자동 종료)", async function () {
    const { coupon, backend, alice, endsAt } = await withActiveCampaign();
    await time.setNextBlockTimestamp(endsAt); // 다음 거래가 정확히 종료 시각에 들어가게
    expect(await buy(coupon, backend, alice, ORCHARD, "o-last")).to.have.length(2); // 종료 시각까지는 발급
    expect(await buy(coupon, backend, alice, ORCHARD, "o-late")).to.have.length(0); // 1초 뒤 블록
  });

  it("참여하지 않은 가게 구매, 없는 기획전 번호로는 쿠폰이 나오지 않는다", async function () {
    const { coupon, backend, alice } = await withActiveCampaign();
    expect(await buy(coupon, backend, alice, WILDFLOWER, "o-1")).to.have.length(0);
    expect(await buy(coupon, backend, alice, ORCHARD, "o-2", 9n)).to.have.length(0);
    expect(await buy(coupon, backend, alice, ORCHARD, "o-3", 0n)).to.have.length(0);
  });

  it("쿠폰은 다른 사람에게 넘길 수 없다 (양도 불가, 승인받은 사람도)", async function () {
    const { coupon, backend, alice, bob } = await withActiveCampaign();
    const [id] = await buyConfirmed(coupon, backend, alice, ORCHARD, "order-1");
    await expect(
      coupon.connect(alice).safeTransferFrom(alice.address, bob.address, id, 1, "0x"),
    ).to.be.revertedWithCustomError(coupon, "TransferDisabled");
    await coupon.connect(alice).setApprovalForAll(bob.address, true);
    await expect(
      coupon.connect(bob).safeTransferFrom(alice.address, bob.address, id, 1, "0x"),
    ).to.be.revertedWithCustomError(coupon, "TransferDisabled");
  });

  it("발급은 백엔드만 할 수 있다", async function () {
    const { coupon, kcp, alice } = await withActiveCampaign();
    for (const who of [kcp, alice]) {
      await expect(
        coupon.connect(who).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ref("o")),
      ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
    }
  });
});
