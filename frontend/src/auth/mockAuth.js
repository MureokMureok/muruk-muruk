// 모의 로그인 — 백엔드 로그인 API가 나오기 전까지 쓰는 가짜 로그인.
// 화면 코드는 이 파일의 함수(loginWithGoogle, getUser, logout)만 부른다.
// 나중에 백엔드와 연결할 때는 이 파일 안쪽만 바꾸면 화면은 그대로 둘 수 있다.
//
// [확정] 소비자·가맹점·KCP 관리자 모두 구글 로그인 (팀 결정)
// 실제로는 구글 계정으로 로그인하면 백엔드가 그 계정의 역할(소비자/가맹점/KCP)을 알려줄 예정.
// 지금은 구글 연동 전이라 "시연용 구글 계정" 중 하나를 고르는 방식으로 흉내 낸다.

// 역할 이름 (화면 이동 기준)
export const ROLES = {
  CONSUMER: 'consumer', // 소비자
  STORE: 'store',       // 가맹점
  KCP: 'kcp',           // KCP 관리자
}

// 시연용 구글 계정 (가짜). 이메일은 예시용 주소(example.com)
// merchantId: 가짜 백엔드(api/seed.js)의 가맹점 번호
export const DEMO_GOOGLE_ACCOUNTS = [
  { id: 'user', name: '지민', email: 'jimin@example.com', role: ROLES.CONSUMER },
  { id: 'store', name: '과수원집', email: 'orchard@example.com', role: ROLES.STORE, merchantId: 'm1' },
  { id: 'store2', name: '봄꽃상회', email: 'flower@example.com', role: ROLES.STORE, merchantId: 'm2' },
  { id: 'store3', name: '바다찬', email: 'sea@example.com', role: ROLES.STORE, merchantId: 'm3' },
  { id: 'kcp', name: 'KCP 운영팀', email: 'ops@example.com', role: ROLES.KCP },
]

// 로그인한 사람 정보를 브라우저에 저장할 때 쓰는 이름표
// (JWT를 어디에 둘지는 백엔드와 정해야 함 — 지금은 임시로 localStorage)
const STORAGE_KEY = 'muruk.user'

function save(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

// 구글 로그인 (모의): 고른 시연용 계정으로 로그인
export async function loginWithGoogle(accountId) {
  const a = DEMO_GOOGLE_ACCOUNTS.find((x) => x.id === accountId)
  if (!a) throw new Error('계정을 찾을 수 없어요.')
  return save({ id: a.id, name: a.name, email: a.email, role: a.role, merchantId: a.merchantId, provider: 'google' })
}

// 지금 로그인한 사람. 없으면 null
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}

// 역할별 첫 화면 주소
export function homePathFor(role) {
  if (role === ROLES.STORE) return '/store'
  if (role === ROLES.KCP) return '/admin'
  return '/home'
}
