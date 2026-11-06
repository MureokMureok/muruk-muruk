// 가짜 백엔드의 "처음 상태" (시연 시작 시점의 데이터).
// 가게·상품·쿠폰 예시는 새 목업 v3(소비자·가맹점 센터·KCP 관리자) 기준: 과수원집·봄꽃상회·바다찬 3곳
//
// 처음 상태는 두 가지 (mode)
// - 'ready'(기본): 기획전이 이미 진행 중 + 지난 이틀간 다른 손님들의 구매·사용 기록이 있음
//                 → 앱을 열자마자 구매하면 쿠폰을 받고, 가맹점·KCP 화면에도 숫자가 보임
// - 'demo': 시연 시작 상태 → ① KCP가 들꽃공방 심사 ② 과수원집이 쿠폰 조건 등록(3/3)
//           ③ KCP가 기획전 시작 승인 ④ 소비자 구매 … (이 상태에서는 아직 쿠폰이 발급되지 않음)

import { addLedger, doConfirm, doPublishPolicy, doPurchase, doRedeem } from './core.js'

// 처음 상태 데이터의 버전. 예시 데이터를 바꾸면 숫자를 올린다 →
// 브라우저에 저장된 예전 시연 데이터가 자동으로 새 데이터로 바뀜 (api.js의 load 참고)
export const SEED_VERSION = 13

export function createSeed(mode = 'ready') {
  const db = createDemoStart()
  return mode === 'demo' ? db : makeReady(db)
}

// 시연 시작 상태
function createDemoStart() {
  const db = {
    version: SEED_VERSION,

    // 무럭무럭 계정 (데이터베이스의 회원 목록). 구글 로그인한 이메일이 여기 있으면 역할 화면으로, 없으면 회원가입으로
    // KCP 관리자는 가입이 없고 여기 미리 넣어 둔 계정만 있다
    accounts: [
      { id: 'user', name: '지민', email: 'jimin@example.com', role: 'consumer' },
      { id: 'store', name: '과수원집', email: 'orchard@example.com', role: 'store', merchantId: 'm1' },
      { id: 'store2', name: '봄꽃상회', email: 'flower@example.com', role: 'store', merchantId: 'm2' },
      { id: 'store3', name: '바다찬', email: 'sea@example.com', role: 'store', merchantId: 'm3' },
      { id: 'kcp', name: 'KCP 운영팀', email: 'ops@example.com', role: 'kcp' },
    ],

    // 소비자 이름 (가게·KCP 화면에는 "지*"처럼 가려서 보여줌)
    users: { user: '지민', u2: '서연', u3: '민호', u4: '하은', u5: '수빈' },

    // 가맹점. status: APPLIED(심사 대기) → APPROVED(승인) / REJECTED(반려)
    // 승인된 가게만 연합 기획전에 참여하고 쿠폰 조건을 등록할 수 있다 (목업 K1)
    merchants: [
      { id: 'm1', name: '과수원집', category: '제철 과일', short: '과', color: '#ffc091', status: 'APPROVED', appliedAt: '2026-10-20', bizChecked: true, channel: '자체 쇼핑몰', kcpPay: true, scale: '소형' },
      { id: 'm2', name: '봄꽃상회', category: '꽃·식물', short: '봄', color: '#ffd7ef', status: 'APPROVED', appliedAt: '2026-10-20', bizChecked: true, channel: '자체 쇼핑몰', kcpPay: true, scale: '소형' },
      { id: 'm3', name: '바다찬', category: '수산·반찬', short: '바', color: '#a0e1e1', status: 'APPROVED', appliedAt: '2026-10-21', bizChecked: true, channel: '오픈마켓 + 자체 쇼핑몰', kcpPay: true, scale: '소형' },
      { id: 'm4', name: '들꽃공방', category: '꽃·식물', short: '들', color: '#ffe7a3', status: 'APPLIED', appliedAt: '2026-11-01', bizChecked: true, channel: '자체 쇼핑몰', kcpPay: true, scale: '소형' },
      { id: 'm5', name: '산골농원', category: '농산물', short: '산', color: '#d5e8b5', status: 'APPLIED', appliedAt: '2026-10-31', bizChecked: true, channel: '오픈마켓', kcpPay: false, scale: '소형' },
    ],

    // 가게별 판매 상품 (시연용 1개씩).
    products: [
      { merchantId: 'm1', name: '제주 제철 감귤 3kg', price: 24900 },
      { merchantId: 'm2', name: '계절 꽃다발 S', price: 25000 },
      { merchantId: 'm3', name: '손질 고등어 5팩', price: 21900 },
      { merchantId: 'm4', name: '드라이플라워 미니 다발', price: 18000 },
      { merchantId: 'm5', name: '햇감자 2kg', price: 12900 },
    ],

    // 연합 기획전. status: PREPARING(준비 중 — 가게들이 쿠폰 조건 등록) → ACTIVE(진행 중) ⇄ PAUSED(일시 중지) → ENDED(종료)
    // 가게별 조건(terms): value 할인 금액(정액만), minOrder 최소 주문, validity 유효기간(DAYS30 받은 날부터 30일 / END 기획전 종료일까지),
    //                    cap 할인 한도(상한), registered 기획전에 등록했는지
    campaigns: [
      {
        id: 'c1',
        title: '겨울 제철 연합 기획전',
        // 시연 기간에 '진행 중'으로 보이도록 11월 한 달 (목업 예시는 11/10~11/23)
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        status: 'PREPARING',
        terms: [
          { merchantId: 'm1', value: 2000, minOrder: 10000, validity: 'DAYS30', cap: 200000, registered: false },
          { merchantId: 'm2', value: 3000, minOrder: 15000, validity: 'DAYS30', cap: 300000, registered: true },
          { merchantId: 'm3', value: 3000, minOrder: 20000, validity: 'DAYS30', cap: 300000, registered: true },
        ],
      },
      {
        id: 'c2',
        title: '연말 꽃·과일 기획전',
        startDate: '2026-12-01',
        endDate: '2026-12-14',
        status: 'PREPARING',
        terms: [
          { merchantId: 'm2', value: 3000, minOrder: 20000, validity: 'END', cap: 150000, registered: true },
          { merchantId: 'm1', value: 2000, minOrder: 15000, validity: 'END', cap: 100000, registered: false },
        ],
      },
    ],

    couponPolicies: [], // 가게가 직접 발행한 일반 쿠폰 (단일 쿠폰). 손님이 받으면 coupons에 한 장씩 생긴다
    coupons: [], // 소비자가 가진 쿠폰 (발급된 쿠폰 한 장 한 장)
    orders: [], // 주문(모의 결제)
    ledger: [], // 기록 (모의). 실제로는 블록체인에 남는 이벤트
  }

  // 지난 관리 기록 (가맹점 승인 → 기획전 만들기 → 쿠폰 조건 등록)
  addLedger(db, '2026-10-22 10:00', 'ADMIN', '과수원집 가맹점 승인', 'KCP', { merchantId: 'm1' })
  addLedger(db, '2026-10-22 10:02', 'ADMIN', '봄꽃상회 가맹점 승인', 'KCP', { merchantId: 'm2' })
  addLedger(db, '2026-10-22 10:05', 'ADMIN', '바다찬 가맹점 승인', 'KCP', { merchantId: 'm3' })
  addLedger(db, '2026-10-27 14:00', 'ADMIN', '겨울 제철 연합 기획전 만들기 (참여 가게 3곳)', 'KCP', { campaignId: 'c1' })
  addLedger(db, '2026-10-28 11:20', 'ADMIN', '봄꽃상회 쿠폰 조건 등록 · 3,000원 · 15,000원 이상', '봄꽃상회', { campaignId: 'c1', merchantId: 'm2' })
  addLedger(db, '2026-10-28 15:05', 'ADMIN', '바다찬 쿠폰 조건 등록 · 3,000원 · 20,000원 이상', '바다찬', { campaignId: 'c1', merchantId: 'm3' })
  addLedger(db, '2026-10-30 09:30', 'ADMIN', '연말 꽃·과일 기획전 만들기 (참여 가게 2곳)', 'KCP', { campaignId: 'c2' })
  addLedger(db, '2026-10-30 16:10', 'ADMIN', '봄꽃상회 쿠폰 조건 등록 · 3,000원 · 20,000원 이상', '봄꽃상회', { campaignId: 'c2', merchantId: 'm2' })
  return db
}

// 'ready': 시연 ①~③(심사·과수원집 조건 등록·KCP 시작 승인)을 이미 마친 상태 + 지난 이틀 기록
function makeReady(db) {
  const c1 = db.campaigns.find((c) => c.id === 'c1')
  c1.terms.find((t) => t.merchantId === 'm1').registered = true
  addLedger(db, '2026-10-31 11:00', 'ADMIN', '과수원집 쿠폰 조건 등록 · 2,000원 · 10,000원 이상', '과수원집', { campaignId: 'c1', merchantId: 'm1' })
  c1.status = 'ACTIVE'
  addLedger(db, '2026-11-01 09:00', 'ADMIN', '겨울 제철 연합 기획전 진행 중으로 바꿈', 'KCP', { campaignId: 'c1' })

  // 다른 손님들의 지난 구매·사용 (실제 규칙 그대로 실행해서 만든다)
  // 지난 기록이라 A 구매 확정·B 구매 확정까지 모두 끝난 상태로 만든다
  const buy = (user, merchantId, at) => {
    const { order, issued } = doPurchase(db, user, merchantId, at)
    doConfirm(db, user, order.id, at)
    return issued
  }
  const redeem = (user, coupons, merchantId, at) => {
    const { order } = doRedeem(db, user, coupons.find((c) => c.merchantId === merchantId).id, merchantId, at)
    doConfirm(db, user, order.id, at)
  }
  const a = buy('u2', 'm1', '2026-11-01 10:12') // 서연: 과수원집 구매 → 봄꽃상회·바다찬 쿠폰
  const b = buy('u3', 'm3', '2026-11-01 13:40') // 민호: 바다찬 구매 → 과수원집·봄꽃상회 쿠폰
  redeem('u2', a, 'm2', '2026-11-01 19:30')
  const c = buy('u4', 'm2', '2026-11-02 09:05') // 하은: 봄꽃상회 구매 → 과수원집·바다찬 쿠폰
  redeem('u3', b, 'm1', '2026-11-02 11:05')
  const d = buy('u5', 'm1', '2026-11-02 15:42') // 수빈: 과수원집 구매
  redeem('u4', c, 'm3', '2026-11-02 18:10')
  redeem('u5', d, 'm2', '2026-11-02 20:11')
  redeem('u3', b, 'm2', '2026-11-02 21:30')

  doPublishPolicy(db, 'm2', { name: '봄꽃상회 꽃다발 2,000원 쿠폰', value: 2000, minOrder: 20000, validDays: 14, quantity: 50 }, '2026-11-03 10:00')
  doPublishPolicy(db, 'm3', { name: '바다찬 첫 주문 1,500원 쿠폰', value: 1500, minOrder: 0, validDays: 7, quantity: 30 }, '2026-11-03 11:30')
  return db
}
