// 모의 로그인 — 백엔드 로그인 API가 나오기 전까지 쓰는 가짜 로그인.
// 화면 코드는 이 파일의 함수(loginWithGoogle, getUser, logout)만 부른다.
// 나중에 백엔드와 연결할 때는 이 파일 안쪽만 바꾸면 화면은 그대로 둘 수 있다.
//
// [확정] 소비자·가맹점·KCP 관리자 모두 구글 로그인 (팀 결정)
// 실제로는 구글 계정으로 로그인하면 백엔드가 가입 여부와 역할(소비자/가맹점/KCP)을 알려줄 예정.
// 지금은 구글 연동 전이라 "시연용 구글 계정" 중 하나를 고르는 방식으로 흉내 낸다.

import { findAccount, signUpConsumer, signUpMerchant } from '../api/api.js'

// 역할 이름 (화면 이동 기준)
export const ROLES = {
  CONSUMER: 'consumer', // 소비자
  STORE: 'store',       // 가맹점
  KCP: 'kcp',           // KCP 관리자
}

// 시연용 구글 계정 (가짜). 이메일은 예시용 주소(example.com)
// 앞의 5개는 무럭무럭 계정이 있고(api/seed.js의 accounts), 뒤의 2개는 가입 전이라 회원가입으로 간다
export const GOOGLE_ACCOUNTS = [
  { id: 'user', name: '지민', email: 'jimin@example.com' },
  { id: 'store', name: '과수원집', email: 'orchard@example.com' },
  { id: 'store2', name: '봄꽃상회', email: 'flower@example.com' },
  { id: 'store3', name: '바다찬', email: 'sea@example.com' },
  { id: 'kcp', name: 'KCP 운영팀', email: 'ops@example.com' },
  { id: 'new1', name: '하늘', email: 'haneul@example.com' },
  { id: 'new2', name: '도윤', email: 'doyun@example.com' },
]

// 로그인한 사람 정보를 브라우저에 저장할 때 쓰는 이름표
// (JWT를 어디에 둘지는 백엔드와 정해야 함 — 지금은 임시로 localStorage)
const STORAGE_KEY = 'muruk.user'
const PENDING_KEY = 'muruk.pendingGoogle'

function save(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

// 무럭무럭 계정 → 로그인 상태로 저장
const saveAccount = (a) => save({ id: a.id, name: a.name, email: a.email, role: a.role, merchantId: a.merchantId, provider: 'google' })

// 구글 로그인 (모의): 고른 구글 계정의 이메일이 데이터베이스에 있는지 확인
// - 있으면 { registered: true, user } → 역할 화면으로
// - 없으면 { registered: false } → 회원가입으로 (구글 정보만 잠깐 기억, 아직 로그인 상태 아님)
export async function loginWithGoogle(accountId) {
  const g = GOOGLE_ACCOUNTS.find((x) => x.id === accountId)
  if (!g) throw new Error('계정을 찾을 수 없어요.')
  const account = await findAccount(g.email)
  if (account) return { registered: true, user: saveAccount(account) }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(g))
  return { registered: false }
}

// 회원가입 중인 구글 계정. 없으면 null (새로고침해도 가입 화면이 유지되게 탭이 닫힐 때까지 기억)
export function getPendingGoogle() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY))
  } catch {
    return null
  }
}

export function cancelSignUp() {
  sessionStorage.removeItem(PENDING_KEY)
}

// 가입이 끝나면 바로 로그인 상태로
function finishSignUp(account) {
  cancelSignUp()
  return saveAccount(account)
}

export async function signUpAsConsumer(name) {
  const g = getPendingGoogle()
  return finishSignUp(await signUpConsumer({ id: g.id, email: g.email, name }))
}

export async function signUpAsMerchant(form) {
  const g = getPendingGoogle()
  return finishSignUp(await signUpMerchant({ ...form, id: g.id, email: g.email }))
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
