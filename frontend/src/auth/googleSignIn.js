// 구글 공식 로그인 (Google Identity Services)
// 구글이 만든 버튼을 화면에 그리고, 로그인이 끝나면 "ID 토큰"을 받는다.
// 이 ID 토큰이 백엔드 POST /api/auth/google 이 받는 값이다 (backend AuthController).
//
// 클라이언트 ID는 frontend/.env의 VITE_GOOGLE_CLIENT_ID에 넣는다 (백엔드 GOOGLE_CLIENT_ID와 같은 값)
// 팀 규칙: 값을 코드·문서·채팅·AI 도구에 올리지 않는다
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let scriptLoading = null // 구글 스크립트는 한 번만 불러온다

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.onload = resolve
    s.onerror = () => {
      scriptLoading = null // 다음에 다시 시도할 수 있게
      reject(new Error('구글 로그인을 불러오지 못했어요.'))
    }
    document.head.appendChild(s)
  })
  return scriptLoading
}

// container 안에 구글 버튼을 그린다. 로그인이 끝나면 onCredential(ID 토큰)을 부른다
export async function renderGoogleButton(container, onCredential) {
  await loadScript()
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  })
  window.google.accounts.id.renderButton(container, {
    theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    locale: 'ko',
    width: Math.min(container.offsetWidth || 340, 400), // 구글 버튼 최대 폭 400px
  })
}

// ID 토큰(JWT) 안의 정보 읽기: 가운데 조각이 base64로 된 JSON이다
// ※ 화면 흐름용으로 읽기만 한다. 토큰이 진짜인지 검증하는 일은 백엔드가 한다
export function readIdToken(idToken) {
  const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const { sub, email, name } = JSON.parse(new TextDecoder().decode(bytes)) // 한글 이름이 깨지지 않게 UTF-8로
  return { sub, email, name }
}
