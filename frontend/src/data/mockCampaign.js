// 화면 확인용 예시 데이터 — 백엔드 API가 나오면 API에서 받아온 값으로 바꾼다.
// 인수인계 문서: 예시 가게는 농수산물·꽃으로 (목업의 화장품·서점·옷가게·카페 대신)

export const CAMPAIGN = {
  id: 'winter-2026',
  title: '겨울 새출발\n연합 기획전',
  period: '12/1 – 12/14',
  summary: '한 곳에서 사면 다른 3곳 쿠폰을 드려요.',
}

// color: 가게 아이콘 바탕색 (목업의 파스텔 색)
export const MERCHANTS = [
  { id: 'm1', name: '햇살 과수원', category: '과일', short: '햇', color: '#ffc091', condition: '10% · 최대 3,000원' },
  { id: 'm2', name: '바다 수산', category: '수산물', short: '바', color: '#a0e1e1', condition: '10% · 최대 5,000원' },
  { id: 'm3', name: '들꽃 플라워', category: '꽃', short: '들', color: '#ffd7ef', condition: '15% · 최대 4,000원' },
  { id: 'm4', name: '초록 채소', category: '채소', short: '초', color: '#ffe7a3', condition: '2,000원 · 1만원 이상' },
]

// 내가 가진 쿠폰 수 (쿠폰함 만들기 전까지 0)
export const MY_COUPON_COUNT = 0
