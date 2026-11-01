// 가짜 백엔드의 "처음 상태" (시연 시작 시점의 데이터).
// 가게·상품·쿠폰 예시는 소비자 와이어프레임 v0(Figma) 기준: 과수원집·봄꽃상회·바다찬 3곳
// (와이어프레임 가정 G6 "기획전 가게 3곳" — 개발팀 확인 필요)
//
// 시연 흐름: ① KCP가 과수원집 입금 확인 → 한도 등록 ② 과수원집이 쿠폰 발행
//           ③ 과수원집이 기획전 조건 서명(마지막 서명) → 규칙 잠금 → KCP 승인 ④ 소비자 구매 …
// 그래서 과수원집만 한도 0, 서명 안 함 상태로 시작한다. 나머지 2곳은 이미 준비 끝난 상태.

// 처음 상태 데이터의 버전. 예시 데이터를 바꾸면 숫자를 올린다 →
// 브라우저에 저장된 예전 시연 데이터가 자동으로 새 데이터로 바뀜 (api.js의 load 참고)
export const SEED_VERSION = 3

export function createSeed() {
  const now = new Date().toISOString()

  return {
    version: SEED_VERSION,
    // 가맹점. limit = KCP가 등록한 발행 한도(입금액만큼), reserved = 쿠폰 발행·기획전 충전금으로 이미 묶인 금액
    merchants: [
      { id: 'm1', name: '과수원집', category: '제철 과일', short: '과', color: '#ffc091', status: 'WHITELISTED', limit: 0, reserved: 0, appliedAt: '2026-10-20' },
      { id: 'm2', name: '봄꽃상회', category: '꽃·식물', short: '봄', color: '#ffd7ef', status: 'WHITELISTED', limit: 500000, reserved: 300000, appliedAt: '2026-10-18' },
      { id: 'm3', name: '바다찬', category: '수산·반찬', short: '바', color: '#a0e1e1', status: 'WHITELISTED', limit: 500000, reserved: 300000, appliedAt: '2026-10-19' },
      { id: 'm4', name: '들녘농산', category: '농산물', short: '들', color: '#ffe7a3', status: 'APPLIED', limit: 0, reserved: 0, appliedAt: '2026-10-30' },
    ],

    // 가게별 판매 상품 (시연용 1개씩)
    products: [
      { merchantId: 'm1', name: '제주 제철 감귤 3kg', price: 24900 },
      { merchantId: 'm2', name: '계절 꽃다발 S', price: 25000 },
      { merchantId: 'm3', name: '손질 고등어 5팩', price: 21900 },
      { merchantId: 'm4', name: '햇감자 2kg', price: 12900 },
    ],

    // 예치금 입금 내역. PENDING = 입금 확인됨, 한도 등록 전
    deposits: [
      { id: 'd1', merchantId: 'm1', amount: 500000, at: '2026-10-31 10:12', status: 'PENDING' },
      { id: 'd2', merchantId: 'm2', amount: 500000, at: '2026-10-21 14:02', status: 'REGISTERED' },
      { id: 'd3', merchantId: 'm3', amount: 500000, at: '2026-10-22 09:40', status: 'REGISTERED' },
    ],

    // 연합 기획전 (1개). status: SIGNING(서명 중) → PENDING_APPROVAL(규칙 잠김, KCP 승인 대기) → ACTIVE / REJECTED
    campaign: {
      id: 'c1',
      title: '겨울 제철 연합 기획전',
      startDate: '2026-11-10',
      endDate: '2026-11-23',
      validDays: 30, // 쿠폰 유효기간: 받은 날부터 30일
      status: 'SIGNING',
      // [확정] 쿠폰은 정액권만 (팀 결정)
      // 가게별 조건. fund = 충전금(= 최대 할인액 × 수량), fundReserved = 발급된 쿠폰 최대 할인액만큼 미리 확보한 금액, fundUsed = 실제 쓰인 할인액
      terms: [
        { merchantId: 'm1', discountType: 'FIXED', value: 2000, maxDiscount: 2000, minOrder: 10000, fund: 200000, fundReserved: 0, fundUsed: 0, signed: false },
        { merchantId: 'm2', discountType: 'FIXED', value: 3000, maxDiscount: 3000, minOrder: 15000, fund: 300000, fundReserved: 0, fundUsed: 0, signed: true },
        { merchantId: 'm3', discountType: 'FIXED', value: 3000, maxDiscount: 3000, minOrder: 20000, fund: 300000, fundReserved: 0, fundUsed: 0, signed: true },
      ],
    },

    // 가맹점이 직접 발행한 조건부 쿠폰 묶음
    issuances: [],

    // 소비자가 가진 쿠폰 (발급된 쿠폰 한 장 한 장)
    coupons: [],

    // 주문(모의 결제)
    orders: [],

    // 체인 기록 (모의). 실제로는 블록체인에 남는 이벤트
    ledger: [
      { block: 18204001, at: '2026-10-21 14:10', type: 'ADMIN', label: '가맹점 등록', detail: '봄꽃상회 지갑 화이트리스트 등록 · 한도 500,000원', actor: 'KCP' },
      { block: 18204002, at: '2026-10-22 09:45', type: 'ADMIN', label: '가맹점 등록', detail: '바다찬 지갑 화이트리스트 등록 · 한도 500,000원', actor: 'KCP' },
      { block: 18204003, at: '2026-10-23 10:00', type: 'ADMIN', label: '가맹점 등록', detail: '과수원집 지갑 화이트리스트 등록 (한도 등록 전)', actor: 'KCP' },
      { block: 18204010, at: '2026-10-28 11:20', type: 'ADMIN', label: '기획전 조건 서명', detail: '봄꽃상회 · 3,000원 할인 · 충전금 300,000원', actor: '봄꽃상회' },
      { block: 18204011, at: '2026-10-28 15:05', type: 'ADMIN', label: '기획전 조건 서명', detail: '바다찬 · 3,000원 할인 · 충전금 300,000원', actor: '바다찬' },
    ],

    createdAt: now,
  }
}
