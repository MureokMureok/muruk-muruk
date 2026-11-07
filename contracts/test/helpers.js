// 테스트 공통 준비: 배포, 가게 번호, 프론트 seed.js(11/3)와 같은 기획전 조건
import hre from "hardhat";

export const { ethers, networkHelpers } = await hre.network.getOrCreate();
export const { time } = networkHelpers;

export const ORCHARD = 1n; // 과수원집
export const FLOWER = 2n; // 봄꽃상회
export const SEA = 3n; // 바다찬
export const WILDFLOWER = 4n; // 들꽃공방 (심사 대기)

export const CAMPAIGN = 1n;
export const DAY = 86_400n;
export const KST = 9n * 3_600n;

export const MerchantStatus = { None: 0n, Approved: 1n, Rejected: 2n };
export const CampaignStatus = { None: 0n, Preparing: 1n, Active: 2n, Paused: 3n, Ended: 4n };
export const Validity = { Days30: 0, CampaignEnd: 1 };
export const Status = { None: 0n, Pending: 1n, Available: 2n, InUse: 3n, Used: 4n, Expired: 5n, Voided: 6n };
export const Reason = {
  Ok: 0n,
  NotOwner: 1n,
  WrongMerchant: 2n,
  Expired: 3n,
  BelowMinOrder: 4n,
  AlreadyUsed: 5n,
  NotConfirmed: 6n,
  InUse: 7n,
  Voided: 8n,
};
export const OrderStatus = { None: 0n, Pending: 1n, Confirmed: 2n, Cancelled: 3n };
export const PaymentStatus = { None: 0n, Locked: 1n, Confirmed: 2n, Cancelled: 3n };

// seed.js campaigns[0].terms (정액권, 받은 날부터 30일)
export const TERMS = {
  [ORCHARD]: { amount: 2_000n, minOrder: 10_000n, validity: Validity.Days30, cap: 200_000n },
  [FLOWER]: { amount: 3_000n, minOrder: 15_000n, validity: Validity.Days30, cap: 300_000n },
  [SEA]: { amount: 3_000n, minOrder: 20_000n, validity: Validity.Days30, cap: 300_000n },
};

export const ref = (s) => ethers.id(s); // 백엔드 ID → keccak256

/** 받은 시각 → 30일째 되는 날 23:59:59 KST (컨트랙트 _days30과 같은 계산) */
export const days30From = (ts) => ((BigInt(ts) + KST) / DAY) * DAY + 31n * DAY - 1n - KST;

export async function deploy() {
  const [kcp, backend, alice, bob] = await ethers.getSigners();
  const coupon = await ethers.deployContract("MurukCoupon", [kcp.address, backend.address]);
  return { coupon, kcp, backend, alice, bob };
}

/** 3곳 승인 (들꽃공방은 심사 대기로 둔다) */
export async function withMerchants() {
  const ctx = await deploy();
  for (const id of [ORCHARD, FLOWER, SEA]) await ctx.coupon.reviewMerchant(id, true);
  return ctx;
}

/** 기획전 만들기 (기본: 지금부터 30일, 3곳). endsAt을 직접 줄 수 있음 */
export async function withCampaign({ endsAt } = {}) {
  const ctx = await withMerchants();
  const now = BigInt(await time.latest());
  ctx.startsAt = now;
  ctx.endsAt = endsAt ?? now + 30n * DAY;
  await ctx.coupon.createCampaign(CAMPAIGN, [ORCHARD, FLOWER, SEA], ctx.startsAt, ctx.endsAt);
  return ctx;
}

/** 기획전 + 3곳 쿠폰 조건 등록 (terms를 바꿔 넣을 수 있음) */
export async function withTerms(terms = TERMS, opts = {}) {
  const ctx = await withCampaign(opts);
  for (const id of [ORCHARD, FLOWER, SEA]) {
    const t = terms[id];
    await ctx.coupon.connect(ctx.backend).registerTerms(CAMPAIGN, id, t.amount, t.minOrder, t.validity, t.cap);
  }
  return ctx;
}

/** 조건 등록 + KCP 시작 승인 (구매하면 쿠폰이 나오는 상태) */
export async function withActiveCampaign(terms = TERMS, opts = {}) {
  const ctx = await withTerms(terms, opts);
  await ctx.coupon.setCampaignStatus(CAMPAIGN, CampaignStatus.Active);
  return ctx;
}

/** 구매 → 발급된 tokenId 목록 (확정 대기 상태) */
export async function buy(coupon, backend, buyer, merchantId, orderId, campaignId = CAMPAIGN) {
  const orderRef = ref(orderId);
  await coupon.connect(backend).issueForPurchase(campaignId, merchantId, buyer.address, orderRef);
  return coupon.issuedFor(orderRef);
}

/** 구매 → 구매 확정까지 (쿠폰이 사용 가능한 상태) */
export async function buyConfirmed(coupon, backend, buyer, merchantId, orderId, campaignId = CAMPAIGN) {
  const ids = await buy(coupon, backend, buyer, merchantId, orderId, campaignId);
  await coupon.connect(backend).confirmPurchase(ref(orderId));
  return ids;
}

/** 쿠폰 사용 = 결제 시작(잠금) → 결제 확정(소각). 잠금이 거절되면 확정하지 않는다 */
export async function use(coupon, backend, tokenId, owner, merchantId, orderAmount, payId) {
  const op = coupon.connect(backend);
  const payRef = ref(payId);
  const [ok] = await op.lockForPayment.staticCall(tokenId, owner.address, merchantId, orderAmount, payRef);
  await op.lockForPayment(tokenId, owner.address, merchantId, orderAmount, payRef);
  if (ok) await op.confirmPayment(payRef);
  return ok;
}
