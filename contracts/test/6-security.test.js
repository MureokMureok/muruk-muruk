// 보안 점검 회귀 테스트 (v2 구조 기준)
import { expect } from "chai";
import {
  ethers,
  deploy,
  withActiveCampaign,
  buy,
  buyConfirmed,
  use,
  ref,
  time,
  CAMPAIGN,
  ORCHARD,
  FLOWER,
  SEA,
  DAY,
  TERMS,
  CampaignStatus,
  Validity,
} from "./helpers.js";

describe("보안 점검 회귀 테스트", function () {
  describe("발급 상한 (할인 한도를 넘는 발급은 컨트랙트가 막음 — M2)", function () {
    it("구매가 계속돼도 가게별 발급 수는 최대 발급 수를 넘지 않는다", async function () {
      // 봄꽃상회 최대 3장, 바다찬 최대 1장
      const terms = {
        ...TERMS,
        [FLOWER]: { ...TERMS[FLOWER], cap: 9_000n },
        [SEA]: { ...TERMS[SEA], cap: 3_000n },
      };
      const { coupon, backend, alice } = await withActiveCampaign(terms);
      for (let i = 0; i < 6; i++) await buy(coupon, backend, alice, ORCHARD, `o-${i}`);

      const f = await coupon.termOf(CAMPAIGN, FLOWER);
      const s = await coupon.termOf(CAMPAIGN, SEA);
      expect([f.issuedCount, f.maxIssue]).to.deep.equal([3n, 3n]);
      expect([s.issuedCount, s.maxIssue]).to.deep.equal([1n, 1n]);
      // 발급된 할인액 합계가 할인 한도를 넘지 않는다
      expect(f.issuedCount * f.amount <= f.cap).to.equal(true);
    });

    it("시작된 뒤에는 일시 중지 중이라도 조건(할인 한도 포함)을 바꿀 수 없다", async function () {
      const { coupon, backend } = await withActiveCampaign();
      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Paused);
      await expect(
        coupon.connect(backend).registerTerms(CAMPAIGN, FLOWER, 3_000n, 15_000n, Validity.Days30, 3_000_000n),
      ).to.be.revertedWithCustomError(coupon, "TermsLocked");
    });
  });

  describe("할인 부담 집계와 체인 기록이 일치 (M1·M4 '같은 기록')", function () {
    it("가게별 burden = CouponRedeemed 이벤트 discount 합계", async function () {
      const { coupon, backend, alice, bob } = await withActiveCampaign();
      const op = coupon.connect(backend);
      const a = await buyConfirmed(coupon, backend, alice, ORCHARD, "o-1"); // 봄꽃·바다찬
      const b = await buyConfirmed(coupon, backend, bob, SEA, "o-2"); // 과수원·봄꽃
      await use(coupon, backend, a[0], alice, FLOWER, 25_000n, "p-1");
      await use(coupon, backend, b[1], bob, FLOWER, 30_000n, "p-2");
      await use(coupon, backend, b[0], bob, ORCHARD, 24_900n, "p-3");
      expect(await use(coupon, backend, b[0], bob, ORCHARD, 24_900n, "p-4")).to.equal(false); // 재사용 → 거절, 집계 안 됨
      // 결제 취소된 쿠폰은 집계되지 않는다
      await op.lockForPayment(a[1], alice.address, SEA, 21_900n, ref("p-5"));
      await op.cancelPayment(ref("p-5"));

      const logs = await coupon.queryFilter(coupon.filters.CouponRedeemed());
      for (const id of [ORCHARD, FLOWER, SEA]) {
        const fromEvents = logs.filter((l) => l.args.merchantId === id).reduce((s, l) => s + l.args.discount, 0n);
        expect((await coupon.termOf(CAMPAIGN, id)).burden, `merchant ${id}`).to.equal(fromEvents);
      }
      expect((await coupon.termOf(CAMPAIGN, FLOWER)).burden).to.equal(6_000n);
      expect((await coupon.termOf(CAMPAIGN, SEA)).burden).to.equal(0n);
    });

    it("구매 취소된 쿠폰은 발급 수에서 빠져서 '발급 수 ≤ 최대 발급 수'가 계속 지켜진다", async function () {
      const terms = { ...TERMS, [FLOWER]: { ...TERMS[FLOWER], cap: 6_000n } }; // 최대 2장
      const { coupon, backend, alice } = await withActiveCampaign(terms);
      for (let i = 0; i < 4; i++) {
        await buy(coupon, backend, alice, ORCHARD, `o-${i}`);
        if (i % 2 === 0) await coupon.connect(backend).cancelPurchase(ref(`o-${i}`));
      }
      const t = await coupon.termOf(CAMPAIGN, FLOWER);
      expect(t.issuedCount <= t.maxIssue).to.equal(true);
      expect(t.issuedCount).to.equal(2n);
    });
  });

  describe("기획전 참여 가게 수 상한 (구매 1건 가스 보호)", function () {
    it("21곳 이상은 만들 수 없다 (TooManyMerchants)", async function () {
      const { coupon } = await deploy();
      const ids = Array.from({ length: 21 }, (_, i) => BigInt(i + 1));
      for (const id of ids) await coupon.reviewMerchant(id, true);
      await expect(coupon.createCampaign(CAMPAIGN, ids, 0, 1))
        .to.be.revertedWithCustomError(coupon, "TooManyMerchants")
        .withArgs(20n);
      expect(await coupon.MAX_CAMPAIGN_MERCHANTS()).to.equal(20n);
    });
  });

  describe("주소·ID 0 방어", function () {
    it("받는 주소 0이면 쿠폰이 안 나가는 주문이라도 항상 거절된다", async function () {
      const { coupon, backend } = await withActiveCampaign();
      const op = coupon.connect(backend);
      await expect(op.issueForPurchase(CAMPAIGN, ORCHARD, ethers.ZeroAddress, ref("o-1"))).to.be.revertedWithCustomError(
        coupon,
        "InvalidAddress",
      );
      await expect(op.issueForPurchase(9n, ORCHARD, ethers.ZeroAddress, ref("o-2"))).to.be.revertedWithCustomError(
        coupon,
        "InvalidAddress",
      );
    });

    it("주문 ID 0이면 거절된다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      await expect(
        coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(coupon, "InvalidRef");
    });

    it("KCP·백엔드 지갑 주소가 0이면 배포되지 않는다", async function () {
      const [kcp, backend] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("MurukCoupon");
      for (const args of [
        [ethers.ZeroAddress, backend.address],
        [kcp.address, ethers.ZeroAddress],
      ]) {
        await expect(factory.deploy(...args)).to.be.revertedWithCustomError(factory, "InvalidAddress");
      }
    });
  });

  describe("권한 구조 (문서화된 동작 확인)", function () {
    it("KCP 지갑은 백엔드 지갑 권한을 회수할 수 있다 (백엔드 키 유출 대응)", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      await coupon.revokeRole(await coupon.OPERATOR_ROLE(), backend.address);
      await expect(
        coupon.connect(backend).issueForPurchase(CAMPAIGN, ORCHARD, alice.address, ref("o-1")),
      ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
    });

    it("백엔드 지갑은 권한을 줄 수 없다", async function () {
      const { coupon, backend, alice } = await deploy();
      await expect(
        coupon.connect(backend).grantRole(await coupon.OPERATOR_ROLE(), alice.address),
      ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
    });
  });

  describe("구매 1건 가스 (블록 가스 한도 1,200만 — KCP 체인 11/3 확인)", function () {
    /** 가게 n곳 기획전에서 구매 1건(쿠폰 n-1장) 가스 */
    async function purchaseGas(n) {
      const { coupon, backend, alice } = await deploy();
      const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1));
      for (const id of ids) await coupon.reviewMerchant(id, true);
      const now = BigInt(await time.latest());
      await coupon.createCampaign(CAMPAIGN, ids, now, now + 30n * DAY);
      for (const id of ids) await coupon.connect(backend).registerTerms(CAMPAIGN, id, 3_000n, 15_000n, 0, 300_000n);
      await coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Active);
      const tx = await coupon.connect(backend).issueForPurchase(CAMPAIGN, 1n, alice.address, ref("o-1"));
      return (await tx.wait()).gasUsed;
    }

    it("시연 규모(3곳, 쿠폰 2장)와 상한 20곳(쿠폰 19장) 모두 블록 한도 안에 들어간다", async function () {
      const g3 = await purchaseGas(3);
      const g20 = await purchaseGas(20);
      console.log(`      가스: 3곳 ${g3.toLocaleString()} · 20곳 ${g20.toLocaleString()}`);
      expect(g3 < 1_000_000n).to.equal(true);
      expect(g20 < 12_000_000n).to.equal(true);
    });
  });
});
