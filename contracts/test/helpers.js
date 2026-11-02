// 테스트 공통 준비: 배포, 가게 번호, 프론트 seed.js와 같은 기획전 조건
import hre from "hardhat";

export const { ethers, networkHelpers } = await hre.network.getOrCreate();

export const ORCHARD = 1n; // 과수원집
export const FLOWER = 2n; // 봄꽃상회
export const SEA = 3n; // 바다찬
export const FIELD = 4n; // 들녘농산 (기획전 미참여)

export const CAMPAIGN = 1n;
export const VALID_DAYS = 30;

// seed.js campaign.terms (정액권)
export const TERMS = {
  [ORCHARD]: { amount: 2_000n, minOrder: 10_000n, fund: 200_000n },
  [FLOWER]: { amount: 3_000n, minOrder: 15_000n, fund: 300_000n },
  [SEA]: { amount: 3_000n, minOrder: 20_000n, fund: 300_000n },
};

export const ReceiveRule = { FirstPurchase: 0, MinAmount: 1 };
export const CampaignStatus = { None: 0n, Signing: 1n, PendingApproval: 2n, Active: 3n, Rejected: 4n, Cancelled: 5n };
export const Status = { None: 0n, Available: 1n, Used: 2n, Expired: 3n };
export const Reason = { Ok: 0n, NotOwner: 1n, WrongMerchant: 2n, Expired: 3n, BelowMinOrder: 4n, AlreadyUsed: 5n };

export const ref = (s) => ethers.id(s); // 백엔드 ID → keccak256

// createIssuance 요청 ID (테스트마다 겹치지 않게 번호를 붙임)
let reqNo = 0;
export const nextRef = () => ref(`issuance-request-${++reqNo}`);

export async function deploy() {
  const [kcp, backend, alice, bob] = await ethers.getSigners();
  const coupon = await ethers.deployContract("MurukCoupon", [kcp.address, backend.address]);
  return { coupon, kcp, backend, alice, bob };
}

/** 3곳 등록 + 한도 50만원씩 */
export async function withMerchants() {
  const ctx = await deploy();
  for (const id of [ORCHARD, FLOWER, SEA, FIELD]) {
    await ctx.coupon.whitelistMerchant(id);
    await ctx.coupon.addLimit(id, 500_000n, ref(`deposit-${id}`));
  }
  return ctx;
}

/** 기획전 생성 → 3곳 서명 (terms를 바꿔 넣을 수 있음) */
export async function withSignedCampaign(terms = TERMS) {
  const ctx = await withMerchants();
  const { coupon, backend } = ctx;
  await coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], VALID_DAYS);
  for (const id of [ORCHARD, FLOWER, SEA]) {
    const t = terms[id];
    await coupon.connect(backend).signCampaign(CAMPAIGN, id, t.amount, t.minOrder, t.fund);
  }
  return ctx;
}

/** 서명 + KCP 승인까지 (구매하면 쿠폰이 나오는 상태) */
export async function withActiveCampaign(terms = TERMS) {
  const ctx = await withSignedCampaign(terms);
  await ctx.coupon.decideCampaign(CAMPAIGN, true);
  return ctx;
}

/** 구매 → 발급된 tokenId 목록 */
export async function buy(coupon, backend, buyer, merchantId, amount, orderId, campaignId = CAMPAIGN) {
  const orderRef = ref(orderId);
  await coupon.connect(backend).issueForPurchase(campaignId, merchantId, buyer.address, amount, orderRef);
  return coupon.issuedFor(orderRef);
}
