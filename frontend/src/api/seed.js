// 가짜 백엔드의 "처음 상태" (시연 시작 시점의 데이터).
// 시연 흐름: ① KCP가 햇살 과수원 입금 확인 → 한도 등록 ② 햇살 과수원이 쿠폰 발행
//           ③ 햇살 과수원이 기획전 조건 서명(마지막 서명) → 규칙 잠금 → KCP 승인 ④ 소비자 구매 …
// 그래서 햇살 과수원만 한도 0, 서명 안 함 상태로 시작한다. 나머지 3곳은 이미 준비 끝난 상태.

export function createSeed() {
  const now = new Date().toISOString()

  return {
    // 가맹점. limit = KCP가 등록한 발행 한도(입금액만큼), reserved = 쿠폰 발행·기획전 충전금으로 이미 묶인 금액
    merchants: [
      { id: 'm1', name: '햇살 과수원', category: '과일', short: '햇', color: '#ffc091', status: 'WHITELISTED', limit: 0, reserved: 0, appliedAt: '2026-10-20' },
      { id: 'm2', name: '바다 수산', category: '수산물', short: '바', color: '#a0e1e1', status: 'WHITELISTED', limit: 300000, reserved: 50000, appliedAt: '2026-10-18' },
      { id: 'm3', name: '들꽃 플라워', category: '꽃', short: '들', color: '#ffd7ef', status: 'WHITELISTED', limit: 300000, reserved: 40000, appliedAt: '2026-10-19' },
      { id: 'm4', name: '초록 채소', category: '채소', short: '초', color: '#ffe7a3', status: 'WHITELISTED', limit: 200000, reserved: 20000, appliedAt: '2026-10-19' },
      { id: 'm5', name: '꽃피는 화원', category: '꽃', short: '꽃', color: '#d9d4f5', status: 'APPLIED', limit: 0, reserved: 0, appliedAt: '2026-10-30' },
    ],

    // 가게별 판매 상품 (시연용 1개씩)
    products: [
      { merchantId: 'm1', name: '제주 감귤 5kg', price: 35000 },
      { merchantId: 'm2', name: '손질 고등어 10팩', price: 28000 },
      { merchantId: 'm3', name: '계절 꽃다발', price: 32000 },
      { merchantId: 'm4', name: '유기농 채소 꾸러미', price: 18000 },
      { merchantId: 'm5', name: '튤립 화분', price: 25000 },
    ],

    // 예치금 입금 내역. PENDING = 입금 확인됨, 한도 등록 전
    deposits: [
      { id: 'd1', merchantId: 'm1', amount: 500000, at: '2026-10-31 10:12', status: 'PENDING' },
      { id: 'd2', merchantId: 'm2', amount: 300000, at: '2026-10-21 14:02', status: 'REGISTERED' },
      { id: 'd3', merchantId: 'm3', amount: 300000, at: '2026-10-22 09:40', status: 'REGISTERED' },
      { id: 'd4', merchantId: 'm4', amount: 200000, at: '2026-10-22 16:25', status: 'REGISTERED' },
    ],

    // 연합 기획전 (1개). status: SIGNING(서명 중) → PENDING_APPROVAL(규칙 잠김, KCP 승인 대기) → ACTIVE / REJECTED
    campaign: {
      id: 'c1',
      title: '겨울 새출발 연합 기획전',
      startDate: '2026-12-01',
      endDate: '2026-12-14',
      status: 'SIGNING',
      // 가게별 조건. fund = 충전금, fundReserved = 발급된 쿠폰 최대 할인액만큼 미리 확보한 금액, fundUsed = 실제 쓰인 할인액
      terms: [
        { merchantId: 'm1', discountType: 'RATE', value: 10, maxDiscount: 3000, minOrder: 20000, fund: 30000, fundReserved: 0, fundUsed: 0, signed: false },
        { merchantId: 'm2', discountType: 'RATE', value: 10, maxDiscount: 5000, minOrder: 20000, fund: 50000, fundReserved: 0, fundUsed: 0, signed: true },
        { merchantId: 'm3', discountType: 'RATE', value: 15, maxDiscount: 4000, minOrder: 20000, fund: 40000, fundReserved: 0, fundUsed: 0, signed: true },
        { merchantId: 'm4', discountType: 'FIXED', value: 2000, maxDiscount: 2000, minOrder: 10000, fund: 20000, fundReserved: 0, fundUsed: 0, signed: true },
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
      { block: 18204001, at: '2026-10-21 14:10', type: 'ADMIN', label: '가맹점 등록', detail: '바다 수산 지갑 화이트리스트 등록 · 한도 300,000원', actor: 'KCP' },
      { block: 18204002, at: '2026-10-22 09:45', type: 'ADMIN', label: '가맹점 등록', detail: '들꽃 플라워 지갑 화이트리스트 등록 · 한도 300,000원', actor: 'KCP' },
      { block: 18204003, at: '2026-10-22 16:30', type: 'ADMIN', label: '가맹점 등록', detail: '초록 채소 지갑 화이트리스트 등록 · 한도 200,000원', actor: 'KCP' },
      { block: 18204004, at: '2026-10-23 10:00', type: 'ADMIN', label: '가맹점 등록', detail: '햇살 과수원 지갑 화이트리스트 등록 (한도 등록 전)', actor: 'KCP' },
      { block: 18204010, at: '2026-10-28 11:20', type: 'ADMIN', label: '기획전 조건 서명', detail: '바다 수산 · 10% 최대 5,000원 · 충전금 50,000원', actor: '바다 수산' },
      { block: 18204011, at: '2026-10-28 15:05', type: 'ADMIN', label: '기획전 조건 서명', detail: '들꽃 플라워 · 15% 최대 4,000원 · 충전금 40,000원', actor: '들꽃 플라워' },
      { block: 18204012, at: '2026-10-29 09:30', type: 'ADMIN', label: '기획전 조건 서명', detail: '초록 채소 · 2,000원 · 충전금 20,000원', actor: '초록 채소' },
    ],

    createdAt: now,
  }
}
