// 로그인 상태 관리. 화면 코드는 이 파일의 함수만 부른다.
// - 진짜 백엔드 모드: VITE_API_BASE_URL과 VITE_GOOGLE_CLIENT_ID가 모두 있을 때. 구글 ID 토큰을 백엔드로 보낸다
// - 모의 모드: 그 외. 모의 데이터베이스(api/seed.js의 accounts)에서 이메일을 찾는다 (시연·개발용)
//
// [확정] 소비자·가맹점·KCP 관리자 모두 구글 로그인 (팀 결정)

import { clearToken, request, setToken } from '../api/http.js'
import { ensureMockUser, findAccount, signUpConsumer, signUpMerchant } from '../api/mock.js'
import { REAL_MODE } from '../api/mode.js'
import { readIdToken } from './googleSignIn.js'

export const USE_BACKEND = REAL_MODE

// 역할 이름 (화면 이동 기준)
export const ROLES = {
  CONSUMER: 'consumer', // 소비자
  STORE: 'store',       // 가맹점
  KCP: 'kcp',           // KCP 관리자
}

// 로그인한 사람 정보를 브라우저에 저장할 때 쓰는 이름표
// (토큰은 api/http.js에 따로 저장)
const STORAGE_KEY = 'muruk.user'
const PENDING_KEY = 'muruk.pendingGoogle'

function save(user) {
  cancelSignUp() // 토큰이 든 이전 가입 대기 정보로 계정이 바뀌지 않게
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

// 무럭무럭 계정 → 로그인 상태로 저장
const saveAccount = (a) => save({ id: a.id, name: a.name, email: a.email, role: a.role, merchantId: a.merchantId, provider: 'google' })

// 구글 로그인 후 계정 확인: 구글 이메일이 데이터베이스에 있는지 본다
// - google: { sub(구글 고유 ID, 임시 입력일 때는 없음), email, name }
// - 있으면 { registered: true, user } → 역할 화면으로
// - 없으면 { registered: false } → 회원가입으로 (구글 정보만 잠깐 기억, 아직 로그인 상태 아님)
export async function loginWithGoogle(google) {
  const account = await findAccount(google.email)
  if (account) return { registered: true, user: saveAccount(account) }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id: `g-${google.sub ?? google.email}`, name: google.name, email: google.email }))
  return { registered: false }
}

// ---------- 진짜 백엔드 로그인 ----------
// 백엔드 주소가 역할별로 나뉘어 있어서 차례로 물어본다 (API 명세서)
// 1) 관리자: 허용 목록에 없으면 403 2) 가맹점: 가입 전이면 404 3) 소비자: 처음이면 이 호출로 계정이 만들어지고 isNewUser
// 관리자·가맹점 로그인이 아직 구현 전이어도 404로 응답하므로 소비자 단계로 넘어간다
async function tryLogin(path, idToken, notThisRole) {
  try {
    return await request('POST', path, { idToken })
  } catch (err) {
    if (notThisRole.includes(err.status)) return null
    throw err
  }
}

const emailOf = (idToken) => readIdToken(idToken).email

function saveLogin(accessToken, user) {
  setToken(accessToken)
  return save({ ...user, provider: 'google' })
}

function saveConsumer({ accessToken, userId, name }, email) {
  ensureMockUser(userId, name) // 쿠폰·주문은 아직 모의 데이터라 거기에도 이름을 알려 둠
  return saveLogin(accessToken, { id: userId, name, email, role: ROLES.CONSUMER })
}

function saveMerchant({ accessToken, merchantId, name, status }, email) {
  return saveLogin(accessToken, { id: `merchant-${merchantId}`, name, email, role: ROLES.STORE, merchantId, merchantStatus: status })
}

async function loginWithBackend(idToken) {
  const email = emailOf(idToken)

  const admin = await tryLogin('/api/admin/auth/google', idToken, [403, 404])
  if (admin) return { registered: true, user: saveLogin(admin.accessToken, { id: 'kcp', name: admin.name, email: admin.email, role: ROLES.KCP }) }

  const merchant = await tryLogin('/api/merchants/auth/google', idToken, [404])
  if (merchant) return { registered: true, user: saveMerchant(merchant, email) }

  const consumer = await request('POST', '/api/auth/google', { idToken })
  if (!consumer.isNewUser) return { registered: true, user: saveConsumer(consumer, email) }

  // 처음 온 사람: 이용자·가맹점을 고를 때까지 로그인 상태로 두지 않는다
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ name: consumer.name, email, idToken, consumer }))
  return { registered: false }
}

// 구글 버튼에서 받은 ID 토큰으로 로그인
export function loginWithIdToken(idToken) {
  return USE_BACKEND ? loginWithBackend(idToken) : loginWithGoogle(readIdToken(idToken))
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

// 백엔드에 이름 변경 API가 생기기 전에는 이 브라우저에만 남고, 다시 로그인하면 구글 이름으로 돌아간다
async function saveMyName(name) {
  try {
    await request('PATCH', '/api/users/me', { name })
  } catch (err) {
    if (err.status !== 404 && err.status !== 405) throw err
  }
}

export async function signUpAsConsumer(name) {
  const g = getPendingGoogle()
  if (USE_BACKEND) {
    // 계정은 첫 로그인 때 이미 만들어졌으니 이름만 바꾼다
    setToken(g.consumer.accessToken)
    await saveMyName(name.trim())
    return saveConsumer({ ...g.consumer, name: name.trim() }, g.email)
  }
  return finishSignUp(await signUpConsumer({ id: g.id, email: g.email, name }))
}

// form: { storeName, category(백엔드 업종 값), bizNumber }
export async function signUpAsMerchant(form) {
  const g = getPendingGoogle()
  if (USE_BACKEND) {
    let result
    try {
      result = await request('POST', '/api/merchants', { idToken: g.idToken, name: form.storeName.trim(), category: form.category, businessNo: form.bizNumber.replace(/\D/g, '') })
    } catch (err) {
      if (err.status === 404) throw new Error('가맹점 신청은 서버 준비 중이에요. 잠시 후 다시 시도해 주세요.', { cause: err })
      throw err
    }
    cancelSignUp()
    return saveMerchant(result, g.email)
  }
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
  cancelSignUp()
  localStorage.removeItem(STORAGE_KEY)
  clearToken()
}

// 역할별 첫 화면 주소
export function homePathFor(role) {
  if (role === ROLES.STORE) return '/store'
  if (role === ROLES.KCP) return '/admin'
  return '/home'
}
