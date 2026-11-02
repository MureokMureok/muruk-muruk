// 보안 점검(11/2)에서 나온 문제의 회귀 테스트 — 고친 버그가 다시 생기지 않는지 확인
import { expect } from "chai";
import {
  ethers,
  networkHelpers,
  deploy,
  withMerchants,
  withSignedCampaign,
  withActiveCampaign,
  buy,
  ref,
  nextRef,
  CAMPAIGN,
  VALID_DAYS,
  ORCHARD,
  FLOWER,
  SEA,
  TERMS,
  ReceiveRule,
  CampaignStatus,
} from "./helpers.js";

describe("보안 점검 회귀 테스트", function () {
  describe("반려·취소된 기획전의 충전금 반환", function () {
    it("KCP가 반려하면 서명한 3곳 충전금이 모두 한도로 돌아온다", async function () {
      const { coupon } = await withSignedCampaign();
      const tx = coupon.decideCampaign(CAMPAIGN, false);
      for (const id of [ORCHARD, FLOWER, SEA]) {
        await expect(tx).to.emit(coupon, "FundReleased").withArgs(CAMPAIGN, id, TERMS[id].fund);
      }
      for (const id of [ORCHARD, FLOWER, SEA]) {
        const [m, remaining] = await coupon.merchantOf(id);
        expect(m.reserved).to.equal(0n);
        expect(remaining).to.equal(500_000n);
      }
    });

    it("반려 뒤 그 가게는 다시 발행할 수 있다", async function () {
      const { coupon, backend } = await withSignedCampaign();
      await coupon.decideCampaign(CAMPAIGN, false);
      await expect(
        coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 500, nextRef()),
      ).to.emit(coupon, "IssuanceCreated");
    });

    it("승인하면 충전금은 그대로 묶여 있다", async function () {
      const { coupon } = await withSignedCampaign();
      await expect(coupon.decideCampaign(CAMPAIGN, true)).to.not.emit(coupon, "FundReleased");
      expect((await coupon.merchantOf(ORCHARD))[0].reserved).to.equal(200_000n);
    });

    it("서명이 멈춘 기획전을 KCP가 취소하면 서명한 가게만 돌려받는다", async function () {
      const { coupon, backend } = await withMerchants();
      await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], VALID_DAYS);
      const t = TERMS[ORCHARD];
      await coupon.connect(backend).signCampaign(CAMPAIGN, ORCHARD, t.amount, t.minOrder, t.fund);

      await expect(coupon.cancelCampaign(CAMPAIGN))
        .to.emit(coupon, "CampaignCancelled")
        .withArgs(CAMPAIGN)
        .and.to.emit(coupon, "FundReleased")
        .withArgs(CAMPAIGN, ORCHARD, 200_000n);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Cancelled);
      expect((await coupon.merchantOf(ORCHARD))[0].reserved).to.equal(0n);

      // 취소된 기획전에는 더 서명할 수 없다
      const f = TERMS[FLOWER];
      await expect(
        coupon.connect(backend).signCampaign(CAMPAIGN, FLOWER, f.amount, f.minOrder, f.fund),
      ).to.be.revertedWithCustomError(coupon, "CampaignNotSigning");
    });

    it("승인 대기 중에도 취소할 수 있다", async function () {
      const { coupon } = await withSignedCampaign();
      await coupon.cancelCampaign(CAMPAIGN);
      expect((await coupon.campaignOf(CAMPAIGN))[0]).to.equal(CampaignStatus.Cancelled);
      expect((await coupon.merchantOf(SEA))[0].reserved).to.equal(0n);
    });

    it("진행 중(쿠폰 발급됨)·반려·취소·없는 기획전은 취소할 수 없고, 백엔드는 취소할 수 없다", async function () {
      const a = await withActiveCampaign();
      await expect(a.coupon.cancelCampaign(CAMPAIGN)).to.be.revertedWithCustomError(a.coupon, "CampaignNotCancellable");
      await expect(a.coupon.cancelCampaign(9n)).to.be.revertedWithCustomError(a.coupon, "CampaignNotCancellable");

      const b = await withSignedCampaign();
      await b.coupon.decideCampaign(CAMPAIGN, false);
      await expect(b.coupon.cancelCampaign(CAMPAIGN)).to.be.revertedWithCustomError(b.coupon, "CampaignNotCancellable");

      const c = await withSignedCampaign();
      await expect(c.coupon.connect(c.backend).cancelCampaign(CAMPAIGN)).to.be.revertedWithCustomError(
        c.coupon,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("반려된 기획전 번호로 구매하면 기획전 쿠폰이 나오지 않는다", async function () {
      const { coupon, backend, alice } = await withSignedCampaign();
      await coupon.decideCampaign(CAMPAIGN, false);
      expect(await buy(coupon, backend, alice, ORCHARD, 24_900n, "order-1")).to.deep.equal([]);
    });
  });

  describe("발행 재시도 방지 (requestRef)", function () {
    it("같은 요청 ID로 다시 부르면 거절되고 한도는 한 번만 묶인다", async function () {
      const { coupon, backend } = await withMerchants();
      const req = ref("issuance-req-A");
      const args = [ORCHARD, 10_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 10, req];
      await coupon.connect(backend).createIssuance(...args);
      await expect(coupon.connect(backend).createIssuance(...args))
        .to.be.revertedWithCustomError(coupon, "IssuanceAlreadyCreated")
        .withArgs(req);

      expect((await coupon.merchantOf(ORCHARD))[0].reserved).to.equal(100_000n);
      expect(await coupon.issuanceFor(req)).to.equal(1n);
      expect(await coupon.issuanceFor(ref("unknown"))).to.equal(0n);
    });

    it("요청 ID 0은 거절된다", async function () {
      const { coupon, backend } = await withMerchants();
      await expect(
        coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 0n, ReceiveRule.MinAmount, 0n, 14, 1, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(coupon, "InvalidRef");
    });
  });

  describe("발행 묶음 상한과 자동 정리 (가스 고갈 방지)", function () {
    const create = (coupon, backend, qty = 1, days = 14) =>
      coupon.connect(backend).createIssuance(ORCHARD, 1n, 0n, ReceiveRule.MinAmount, 1_000_000n, days, qty, nextRef());

    it("진행 중 묶음은 가게당 20개까지만 만들 수 있다", async function () {
      const { coupon, backend } = await withMerchants();
      for (let i = 0; i < 20; i++) await create(coupon, backend);
      await expect(create(coupon, backend))
        .to.be.revertedWithCustomError(coupon, "TooManyIssuances")
        .withArgs(ORCHARD, 20n);
    });

    it("수량이 다 떨어진 묶음은 빠져서 새로 만들 수 있다", async function () {
      const { coupon, backend, alice } = await withMerchants();
      // 1장짜리 묶음 1개 + 다른 묶음 19개 (받는 조건 100만원이라 발급 안 됨)
      await coupon.connect(backend).createIssuance(ORCHARD, 1n, 0n, ReceiveRule.MinAmount, 0n, 14, 1, nextRef());
      for (let i = 0; i < 19; i++) await create(coupon, backend);
      await expect(create(coupon, backend)).to.be.revertedWithCustomError(coupon, "TooManyIssuances");

      expect(await buy(coupon, backend, alice, ORCHARD, 10_000n, "order-1", 0n)).to.have.length(1); // 1장짜리 소진
      await expect(create(coupon, backend)).to.emit(coupon, "IssuanceCreated");
    });

    it("유효기간이 지난 묶음은 빠지고, 그 묶음에서는 더 발급되지 않는다", async function () {
      const { coupon, backend, alice } = await withMerchants();
      await coupon.connect(backend).createIssuance(ORCHARD, 1_000n, 0n, ReceiveRule.MinAmount, 0n, 1, 50, nextRef());
      for (let i = 0; i < 19; i++) await create(coupon, backend, 1, 30);

      await networkHelpers.time.increase(2 * 24 * 60 * 60); // 2일 뒤 → 1일짜리 묶음 만료
      expect(await buy(coupon, backend, alice, ORCHARD, 10_000n, "order-1", 0n)).to.deep.equal([]);
      await expect(create(coupon, backend)).to.emit(coupon, "IssuanceCreated");
    });

    it("묶음이 상한까지 차 있어도 구매 처리 가스가 일정 범위 안이다", async function () {
      const { coupon, backend, alice } = await withActiveCampaign();
      for (let i = 0; i < 20; i++) await create(coupon, backend, 1000);
      const tx = await coupon
        .connect(backend)
        .issueForPurchase(CAMPAIGN, ORCHARD, alice.address, 24_900n, ref("order-gas"));
      const { gasUsed } = await tx.wait();
      // 기획전 쿠폰 2장 + 묶음 20개 확인. 묶음이 무한히 쌓이던 문제(1,500개 → 1,030만 gas) 방지
      expect(gasUsed).to.be.lessThan(1_500_000n);
    });
  });

  describe("주소·ID 0 방어", function () {
    it("받는 주소 0이면 쿠폰이 안 나가는 주문이라도 항상 거절된다", async function () {
      const { coupon, backend } = await withMerchants();
      await expect(
        coupon.connect(backend).issueForPurchase(0n, ORCHARD, ethers.ZeroAddress, 10_000n, ref("order-1")),
      ).to.be.revertedWithCustomError(coupon, "InvalidAddress");
      expect(await coupon.hasPurchased(ethers.ZeroAddress, ORCHARD)).to.equal(false);
    });

    it("주문 ID 0이면 거절된다", async function () {
      const { coupon, backend, alice } = await withMerchants();
      await expect(
        coupon.connect(backend).issueForPurchase(0n, ORCHARD, alice.address, 10_000n, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(coupon, "InvalidRef");
    });

    it("KCP·백엔드 지갑 주소가 0이면 배포되지 않는다", async function () {
      const [kcp, backend] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("MurukCoupon");
      await expect(factory.deploy(ethers.ZeroAddress, backend.address)).to.be.revertedWithCustomError(
        factory,
        "InvalidAddress",
      );
      await expect(factory.deploy(kcp.address, ethers.ZeroAddress)).to.be.revertedWithCustomError(
        factory,
        "InvalidAddress",
      );
    });
  });

  describe("권한 구조 (문서화된 동작 확인)", function () {
    it("KCP 지갑은 백엔드 지갑 권한을 회수할 수 있다 (백엔드 키 유출 대응)", async function () {
      const { coupon, backend, alice } = await deploy();
      await coupon.revokeRole(await coupon.OPERATOR_ROLE(), backend.address);
      await expect(
        coupon.connect(backend).issueForPurchase(0n, ORCHARD, alice.address, 1n, ref("order-1")),
      ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
    });
  });
});
