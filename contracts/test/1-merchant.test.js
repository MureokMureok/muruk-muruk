// 1단계: 가맹점 등록과 발행 한도 (시연 ① KCP 입금·한도 화면)
import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.getOrCreate();

const ORCHARD = 1n; // 과수원집
const ref = (s) => ethers.id(s); // 백엔드 입금 ID → keccak256

describe("1단계 가맹점·한도", function () {
  let coupon, kcp, backend, stranger;

  beforeEach(async function () {
    [kcp, backend, stranger] = await ethers.getSigners();
    coupon = await ethers.deployContract("MurukCoupon", [kcp.address, backend.address]);
  });

  it("KCP가 가맹점을 등록하면 등록 상태가 된다", async function () {
    await expect(coupon.whitelistMerchant(ORCHARD))
      .to.emit(coupon, "MerchantWhitelisted")
      .withArgs(ORCHARD);

    const [m, remaining] = await coupon.merchantOf(ORCHARD);
    expect(m.whitelisted).to.equal(true);
    expect(m.limit).to.equal(0n);
    expect(remaining).to.equal(0n);
  });

  it("입금 50만원을 확인하면 한도가 50만원 생긴다", async function () {
    await coupon.whitelistMerchant(ORCHARD);

    await expect(coupon.addLimit(ORCHARD, 500_000n, ref("deposit-1")))
      .to.emit(coupon, "LimitAdded")
      .withArgs(ORCHARD, 500_000n, 500_000n, ref("deposit-1"));

    const [m, remaining] = await coupon.merchantOf(ORCHARD);
    expect(m.limit).to.equal(500_000n);
    expect(remaining).to.equal(500_000n);
  });

  it("입금을 두 번 하면 한도가 더해진다", async function () {
    await coupon.whitelistMerchant(ORCHARD);
    await coupon.addLimit(ORCHARD, 500_000n, ref("deposit-1"));
    await coupon.addLimit(ORCHARD, 300_000n, ref("deposit-2"));

    const [m] = await coupon.merchantOf(ORCHARD);
    expect(m.limit).to.equal(800_000n);
  });

  it("등록 안 된 가게는 한도를 받을 수 없다", async function () {
    await expect(coupon.addLimit(ORCHARD, 500_000n, ref("deposit-1")))
      .to.be.revertedWithCustomError(coupon, "NotWhitelisted")
      .withArgs(ORCHARD);
  });

  it("0원 한도는 등록할 수 없다", async function () {
    await coupon.whitelistMerchant(ORCHARD);
    await expect(coupon.addLimit(ORCHARD, 0n, ref("deposit-1"))).to.be.revertedWithCustomError(
      coupon,
      "InvalidAmount",
    );
  });

  it("KCP가 아닌 지갑(백엔드 포함)은 가맹점 등록·한도 추가를 못 한다", async function () {
    for (const who of [backend, stranger]) {
      await expect(coupon.connect(who).whitelistMerchant(ORCHARD)).to.be.revertedWithCustomError(
        coupon,
        "AccessControlUnauthorizedAccount",
      );
    }
    await coupon.whitelistMerchant(ORCHARD);
    await expect(
      coupon.connect(backend).addLimit(ORCHARD, 500_000n, ref("deposit-1")),
    ).to.be.revertedWithCustomError(coupon, "AccessControlUnauthorizedAccount");
  });

  it("쿠폰 컨트랙트는 ERC-1155 표준을 따른다", async function () {
    expect(await coupon.supportsInterface("0xd9b67a26")).to.equal(true); // ERC-1155
  });
});
