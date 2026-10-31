// 상태 코드 → 화면에 보일 글자·색 (여러 화면에서 같이 씀)

// 기획전 상태
export const CAMPAIGN_STATUS = {
  SIGNING: { label: '조건 서명 중', cls: 'c-wait' },
  PENDING_APPROVAL: { label: '규칙 잠김 · 승인 대기', cls: 'c-info' },
  ACTIVE: { label: '진행 중', cls: 'c-ok' },
  REJECTED: { label: '반려됨', cls: 'c-bad' },
}

// 가맹점 쿠폰 받는 조건
export const RECEIVE_LABEL = { FIRST_PURCHASE: '첫 구매 시 자동', MIN_AMOUNT: '일정 금액 이상 구매 시' }

// KCP 권한 범위 (목업 a-console 문구)
export const KCP_CAN = '가맹점 확인 · 지갑 화이트리스트 · 입금 확인 후 한도 등록 · 기획전 승인/반려'
export const KCP_CANNOT = '쿠폰 직접 발행 · 잠긴 규칙 변경 · 기록 수정 · 예산 이동'
