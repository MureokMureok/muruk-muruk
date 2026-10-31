// 모의 로그인 — 백엔드 로그인 API가 나오기 전까지 쓰는 가짜 로그인.
// 화면 코드는 이 파일의 함수(loginWithId, loginWithSocial, getUser, logout)만 부른다.
// 나중에 백엔드와 연결할 때는 이 파일 안쪽만 바꾸면 화면은 그대로 둘 수 있다.

// 역할 이름 (화면 이동 기준)
export const ROLES = {
  CONSUMER: 'consumer', // 소비자
  STORE: 'store',       // 가맹점
  KCP: 'kcp',           // KCP 관리자
}

// 시드(미리 만들어 둔) 계정 — 시연·개발용 가짜 계정. 실제 비밀번호 아님.
// mvp-spec 초안: "가맹점·KCP는 시드 계정"
const SEED_ACCOUNTS = [
  { id: 'user', password: '1234', name: '지민', role: ROLES.CONSUMER },
  { id: 'store', password: '1234', name: '하늘 농원', role: ROLES.STORE },
  { id: 'kcp', password: '1234', name: 'KCP 운영팀', role: ROLES.KCP },
]

// 로그인한 사람 정보를 브라우저에 저장할 때 쓰는 이름표
// (JWT를 어디에 둘지는 백엔드와 정해야 함 — 지금은 임시로 localStorage)
const STORAGE_KEY = 'muruk.user'

function save(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

// 아이디·비밀번호 로그인. 성공하면 사용자 정보, 실패하면 에러를 던진다.
export async function loginWithId(id, password) {
  const found = SEED_ACCOUNTS.find((a) => a.id === id && a.password === password)
  if (!found) throw new Error('아이디 또는 비밀번호가 맞지 않아요.')
  // 비밀번호는 저장하지 않고 필요한 정보만 남긴다
  return save({ id: found.id, name: found.name, role: found.role })
}

// PAYCO·카카오·Google 로그인 (모의). 실제 OAuth 연결 전이라 항상 소비자로 로그인된다.
export async function loginWithSocial(provider) {
  return save({ id: `${provider}-demo`, name: '지민', role: ROLES.CONSUMER, provider })
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
