// 시연 8장면(frontend/README.md)을 체인에 실제로 실행하고, 거래마다 tx·블록·가스·이벤트를 출력한다.
// 한 번에 실행:     npx hardhat run scripts/demo.js
// 로컬 노드에 실행: 터미널 1 `npx hardhat node` → 터미널 2 `npx hardhat run scripts/demo.js --network localhost`
// 실행할 때마다 컨트랙트를 새로 배포하므로 몇 번이든 다시 돌릴 수 있다.
// 계정: #0 = KCP(ADMIN), #1 = 백엔드 서버 지갑(OPERATOR), #2 = 소비자 지갑 (Hardhat 공개 연습용 계정)
import { network } from "hardhat";

const connection = await network.getOrCreate();
const { ethers } = connection;
const signers = await ethers.getSigners();
// KCP 테스트넷처럼 배포 계정이 하나뿐이면: 백엔드 역할도 같은 계정이 맡고, 소비자는 주소만 쓰므로 새 빈 주소를 만든다
const [kcp] = signers;
const backend = signers[1] ?? kcp;
const consumer = signers[2] ?? ethers.Wallet.createRandom();

const NAMES = { 1: "과수원집", 2: "봄꽃상회", 3: "바다찬", 4: "들꽃공방" };
// seed.js 쿠폰 조건 (할인 금액, 최소 주문, 유효기간 0 = 받은 날부터 30일, 할인 한도)
const TERMS = { 1: [2_000n, 10_000n, 0, 200_000n], 2: [3_000n, 15_000n, 0, 300_000n], 3: [3_000n, 20_000n, 0, 300_000n] };
const CAMPAIGN = 1n;
const Active = 2;

const STATUS = ["없음", "확정 대기", "사용 가능", "결제 중", "사용 완료", "만료", "무효"];
const REASON = ["Ok", "NotOwner", "WrongMerchant", "Expired", "BelowMinOrder", "AlreadyUsed", "NotConfirmed", "InUse", "Voided"];
const won = (v) => `${Number(v).toLocaleString("ko-KR")}원`;
const short = (h) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const ref = (s) => ethers.id(s);
const kstDate = (ts) => new Date((Number(ts) + 9 * 3600) * 1000).toISOString().slice(0, 16).replace("T", " ");

let coupon;

/** 트랜잭션 1건 실행 → 한 줄 요약 + 남긴 이벤트 이름 출력 */
async function send(label, txPromise) {
  const tx = await txPromise;
  const r = await tx.wait();
  const events = r.logs
    .map((l) => {
      try {
        return coupon.interface.parseLog(l)?.name;
      } catch {
        return undefined;
      }
    })
    .filter((n) => n && n !== "TransferSingle");
  console.log(
    `${label.padEnd(36)} tx ${short(r.hash)}  block ${String(r.blockNumber).padStart(3)}  gas ${Number(r.gasUsed).toLocaleString().padStart(9)}  ${events.join(", ")}`,
  );
  return r;
}

console.log(`\n네트워크: ${connection.networkName} (chainId ${(await ethers.provider.getNetwork()).chainId})`);
console.log(`KCP ${short(kcp.address)} / 백엔드 ${short(backend.address)} / 소비자 ${short(consumer.address)}\n`);

// 배포
coupon = await ethers.deployContract("MurukCoupon", [kcp.address, backend.address]);
const dr = await coupon.deploymentTransaction().wait();
console.log(`${"[배포] MurukCoupon".padEnd(36)} tx ${short(dr.hash)}  block ${String(dr.blockNumber).padStart(3)}  gas ${Number(dr.gasUsed).toLocaleString().padStart(9)}  주소 ${await coupon.getAddress()}`);

const asKcp = coupon.connect(kcp);
const asBackend = coupon.connect(backend);

// 시작 상태 (seed.js "시연 시작 상태"): 3곳 승인, 기획전 준비 중, 봄꽃상회·바다찬 조건 등록
console.log("\n— 시작 상태 만들기 —");
for (const id of [1n, 2n, 3n]) await send(`[준비] 가맹점 승인: ${NAMES[id]}`, asKcp.reviewMerchant(id, true));
const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
await send("[준비] 겨울 제철 연합 기획전 만들기 (3곳, 30일)", asKcp.createCampaign(CAMPAIGN, [1n, 2n, 3n], now, now + 30n * 86_400n));
for (const id of [2n, 3n]) await send(`[준비] ${NAMES[id]} 쿠폰 조건 등록`, asBackend.registerTerms(CAMPAIGN, id, ...TERMS[id]));

console.log("\n— 시연 8장면 —");
// 1 KCP: 들꽃공방 참여 신청 승인
await send("[1 KCP] 가맹점 심사: 들꽃공방 승인", asKcp.reviewMerchant(4n, true));

// 2 과수원집: 쿠폰 조건 등록 (3/3)
await send("[2 과수원집] 쿠폰 조건 등록 (3/3)", asBackend.registerTerms(CAMPAIGN, 1n, ...TERMS[1]));

// 3 KCP: 시작 승인
await send("[3 KCP] 기획전 시작 승인", asKcp.setCampaignStatus(CAMPAIGN, Active));

// 4 지민: 과수원집 감귤 24,900원 결제 → 다른 가게 쿠폰 2장 (확정 대기) → 구매 확정 → 사용 가능
await send("[4 구매] 과수원집 감귤 24,900원", asBackend.issueForPurchase(CAMPAIGN, 1n, consumer.address, ref("order-1")));
const ids = await coupon.issuedFor(ref("order-1"));
console.log(`      → 쿠폰 ${ids.length}장 발급, 상태 ${STATUS[Number(await coupon.statusOf(ids[0]))]}`);
await send("[4 구매 확정] 과수원집 주문", asBackend.confirmPurchase(ref("order-1")));

// 5 쿠폰함
console.log(`[5 쿠폰함] ${ids.length}장`);
for (const id of ids) {
  const c = await coupon.couponOf(id);
  console.log(`      #${id} ${NAMES[c.merchantId]} ${won(c.amount)} (최소 ${won(c.minOrder)}, ${kstDate(c.expiresAt)}까지)`);
}

// 6 봄꽃상회 꽃다발 25,000원 → 22,000원
const flower = ids[0];
const reason = await coupon.check(flower, consumer.address, 2n, 25_000n);
console.log(`[6 사용 전 검사] 쿠폰 #${flower} → ${reason === 0n ? "통과 (5가지 모두 OK)" : `거절 사유 ${REASON[Number(reason)]}`}`);
await send(`[6 결제 시작] 쿠폰 #${flower} 잠금`, asBackend.lockForPayment(flower, consumer.address, 2n, 25_000n, ref("pay-1")));
console.log(`      → 상태 ${STATUS[Number(await coupon.statusOf(flower))]}`);
await send("[6 결제 확정] 봄꽃상회 25,000원", asBackend.confirmPayment(ref("pay-1")));
const used = await coupon.couponOf(flower);
console.log(`      → 할인 ${won(used.discount)}, 결제 ${won(25_000n - used.discount)}, 보유 수 ${await coupon.balanceOf(consumer.address, flower)}`);

// 7 같은 쿠폰 다시 써보기 → 거절
const [, rejectReason] = await asBackend.lockForPayment.staticCall(flower, consumer.address, 2n, 25_000n, ref("pay-2"));
await send(`[7 재사용] 쿠폰 #${flower}`, asBackend.lockForPayment(flower, consumer.address, 2n, 25_000n, ref("pay-2")));
console.log(`      → 거절 사유: ${REASON[Number(rejectReason)]}`);

// 8 할인 부담 내역 · 기록 조회 (읽기만)
console.log("\n[8 할인 부담] 가게별 (쓰인 만큼만)");
for (const id of [1n, 2n, 3n]) {
  const t = await coupon.termOf(CAMPAIGN, id);
  console.log(`      ${NAMES[id].padEnd(5)} 발급 ${t.issuedCount}/${t.maxIssue}장 · 사용 ${t.usedCount}장 · 할인 부담 ${won(t.burden)}`);
}
// 배포한 블록부터만 찾는다 (실제 체인은 블록이 많아서 처음부터 찾으면 조회 범위 제한에 걸릴 수 있음)
const count = async (f) => (await coupon.queryFilter(f, dr.blockNumber)).length;
console.log(
  `\n[8 기록 조회] 발급 ${await count(coupon.filters.CouponIssued())}건 · 사용 ${await count(coupon.filters.CouponRedeemed())}건 · 거절 ${await count(coupon.filters.RedeemRejected())}건 · 관리 ${(await count(coupon.filters.MerchantReviewed())) + (await count(coupon.filters.TermsRegistered())) + (await count(coupon.filters.CampaignStatusChanged())) + (await count(coupon.filters.CampaignCreated()))}건`,
);
console.log(`컨트랙트 주소: ${await coupon.getAddress()}  (콘솔에서 getContractAt으로 이어서 조회 가능)\n`);
