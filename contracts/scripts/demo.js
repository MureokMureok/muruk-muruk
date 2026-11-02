// 시연 흐름(①~⑧)을 체인에 실제로 실행하고, 거래마다 tx·블록·가스·이벤트를 출력한다.
// 로컬 체인: 터미널 1 `npx hardhat node` → 터미널 2 `npx hardhat run scripts/demo.js --network localhost`
// 실행할 때마다 컨트랙트를 새로 배포하므로 몇 번이든 다시 돌릴 수 있다.
// 계정: #0 = KCP(ADMIN), #1 = 백엔드 서버 지갑(OPERATOR), #2 = 소비자 지갑 (Hardhat 공개 연습용 계정)
import { network } from "hardhat";

const connection = await network.getOrCreate();
const { ethers } = connection;
const [kcp, backend, consumer] = await ethers.getSigners();

const NAMES = { 1: "과수원집", 2: "봄꽃상회", 3: "바다찬" };
const won = (v) => `${Number(v).toLocaleString("ko-KR")}원`;
const short = (h) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const ref = (s) => ethers.id(s);
const date = (ts) => new Date(Number(ts) * 1000).toISOString().slice(0, 10);

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
    `${label.padEnd(34)} tx ${short(r.hash)}  block ${String(r.blockNumber).padStart(3)}  gas ${Number(r.gasUsed).toLocaleString().padStart(9)}  ${events.join(", ")}`,
  );
  return r;
}

async function printCoupons(ids) {
  for (const id of ids) {
    const c = await coupon.couponOf(id);
    console.log(
      `      #${id} ${NAMES[c.merchantId]} ${won(c.amount)} (최소 ${won(c.minOrder)}, ~${date(c.expiresAt)}) ${c.source === 0n ? "기획전" : "보너스"}`,
    );
  }
}

console.log(`\n네트워크: ${connection.networkName} (chainId ${(await ethers.provider.getNetwork()).chainId})`);
console.log(`KCP ${short(kcp.address)} / 백엔드 ${short(backend.address)} / 소비자 ${short(consumer.address)}\n`);

// 배포
coupon = await ethers.deployContract("MurukCoupon", [kcp.address, backend.address]);
const dr = await coupon.deploymentTransaction().wait();
console.log(`${"[배포] MurukCoupon".padEnd(34)} tx ${short(dr.hash)}  block ${String(dr.blockNumber).padStart(3)}  gas ${Number(dr.gasUsed).toLocaleString().padStart(9)}  주소 ${await coupon.getAddress()}`);

const asKcp = coupon.connect(kcp);
const asBackend = coupon.connect(backend);

// ① KCP: 가맹점 등록, 입금 확인 → 한도, 기획전 생성
for (const id of [1n, 2n, 3n]) {
  await send(`[① KCP] 가맹점 등록: ${NAMES[id]}`, asKcp.whitelistMerchant(id));
  await send(`[① KCP] 한도 등록: ${NAMES[id]} ${won(500000)}`, asKcp.addLimit(id, 500_000n, ref(`deposit-${id}`)));
}
await send("[① KCP] 연합 기획전 생성 (3곳, 30일)", asKcp.createCampaign(1n, [1n, 2n, 3n], 30));

// ② 가맹점: 첫 구매 쿠폰 직접 발행
await send(
  "[② 과수원집] 첫 구매 쿠폰 1,000원 × 50장",
  asBackend.createIssuance(1n, 1_000n, 5_000n, 0, 10_000n, 14, 50, ref("issuance-req-1")),
);

// ③ 가맹점 서명 → 규칙 잠금 → KCP 승인 (seed.js 조건)
const terms = { 1: [2_000n, 10_000n, 200_000n], 2: [3_000n, 15_000n, 300_000n], 3: [3_000n, 20_000n, 300_000n] };
for (const id of [1n, 2n, 3n]) {
  await send(`[③ ${NAMES[id]}] 기획전 조건 서명`, asBackend.signCampaign(1n, id, ...terms[id]));
}
await send("[③ KCP] 기획전 승인", asKcp.decideCampaign(1n, true));

// ④ 소비자: 과수원집 24,900원 구매 → 쿠폰 발급
await send("[④ 구매] 과수원집 24,900원", asBackend.issueForPurchase(1n, 1n, consumer.address, 24_900n, ref("order-1")));
const ids = await coupon.issuedFor(ref("order-1"));
console.log(`      → 쿠폰 ${ids.length}장 발급`);
await printCoupons(ids);

// ⑥ 소비자: 봄꽃상회 25,000원 결제 승인 후 사용
const flower = ids[0];
const reason = await coupon.check(flower, consumer.address, 2n, 25_000n);
console.log(`[⑥ 사용 전 검사] 쿠폰 #${flower} → ${reason === 0n ? "통과 (5가지 모두 OK)" : `거절 사유 ${reason}`}`);
await send(`[⑥ 사용] 봄꽃상회 25,000원, 쿠폰 #${flower}`, asBackend.redeem(flower, consumer.address, 2n, 25_000n, ref("pay-1")));
console.log(`      → 쿠폰 #${flower} 상태: ${["없음", "사용 가능", "사용 완료(소각)", "만료"][Number(await coupon.statusOf(flower))]}, 소비자 보유 수 ${await coupon.balanceOf(consumer.address, flower)}`);

// ⑦ 같은 쿠폰 재사용 → 거절 (기록만 남음)
const [, rejectReason] = await asBackend.redeem.staticCall(flower, consumer.address, 2n, 25_000n, ref("pay-2"));
await send(`[⑦ 재사용] 쿠폰 #${flower}`, asBackend.redeem(flower, consumer.address, 2n, 25_000n, ref("pay-2")));
console.log(`      → 거절 사유: ${["Ok", "NotOwner", "WrongMerchant", "Expired", "BelowMinOrder", "AlreadyUsed"][Number(rejectReason)]}`);

// ⑧ 정산·체인 기록 (읽기만)
console.log("\n[⑧ 정산] 기획전 충전금");
for (const id of [1n, 2n, 3n]) {
  const t = await coupon.termOf(1n, id);
  console.log(`      ${NAMES[id].padEnd(5)} 충전금 ${won(t.fund).padStart(10)} · 발급 확보 ${won(t.fundReserved).padStart(7)} · 사용(가게 부담) ${won(t.fundUsed)}`);
}
const redeemed = await coupon.queryFilter(coupon.filters.CouponRedeemed());
const rejected = await coupon.queryFilter(coupon.filters.RedeemRejected());
console.log(`\n[체인 기록] 사용 ${redeemed.length}건 · 거절 ${rejected.length}건 · 현재 블록 ${await ethers.provider.getBlockNumber()}`);
console.log(`컨트랙트 주소: ${await coupon.getAddress()}  (콘솔에서 getContractAt으로 이어서 조회 가능)\n`);
