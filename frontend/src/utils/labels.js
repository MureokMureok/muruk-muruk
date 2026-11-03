// 상태 코드 → 화면에 보일 글자·칩 색 (여러 화면에서 같이 씀)
// 칩 색: '' 기본(민트) · y 노랑 · r 빨강 · g 회색 · b 파랑 · dk 진녹

// 연합 기획전 상태
export const CAMPAIGN_STATUS = {
  PREPARING: { label: '준비 중', tone: 'b' },
  ACTIVE: { label: '진행 중', tone: '' },
  PAUSED: { label: '일시 중지', tone: 'y' },
  ENDED: { label: '종료', tone: 'g' },
}

// 가맹점 심사 상태
export const MERCHANT_STATUS = {
  APPLIED: { label: '심사 대기', tone: 'y' },
  APPROVED: { label: '승인', tone: '' },
  REJECTED: { label: '반려', tone: 'r' },
}

// 기록 종류
export const LEDGER_TYPE = {
  ISSUE: { label: '발급', tone: '' },
  USE: { label: '사용', tone: 'g' },
  REJECT: { label: '거절', tone: 'r' },
  ADMIN: { label: '관리', tone: 'b' },
}

// 쿠폰 유효기간 방식
export const VALIDITY = {
  DAYS30: '받은 날부터 30일',
  END: '기획전 종료일까지',
}

// 한도 임박: 발급이 한도의 80% 이상
export const nearLimit = (t) => t.qtyTotal > 0 && t.issued / t.qtyTotal >= 0.8
