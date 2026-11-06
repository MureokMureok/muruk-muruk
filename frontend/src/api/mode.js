import { GOOGLE_CLIENT_ID } from '../auth/googleSignIn.js'
import { API_BASE } from './http.js'

// 실서버 토큰은 구글 로그인으로만 받을 수 있어서 두 값이 모두 있어야 실서버 모드다
export const REAL_MODE = Boolean(API_BASE && GOOGLE_CLIENT_ID)

// 백엔드가 만들어지는 대로 함수를 하나씩 켠다. 예: VITE_REAL_APIS=getCampaign,purchase / 전부: all
const REAL_APIS = new Set(
  (import.meta.env.VITE_REAL_APIS ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
)

export const isRealApi = (name) => REAL_MODE && (REAL_APIS.has('all') || REAL_APIS.has(name))
