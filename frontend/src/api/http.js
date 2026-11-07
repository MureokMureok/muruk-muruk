// 진짜 백엔드 호출 도구
// 백엔드 응답은 항상 { isSuccess, code, message, result } 모양이다 (노션 "공통 응답 및 예외 처리 규칙")
// 성공이면 result만 돌려주고, 실패면 code·message·status가 담긴 ApiError를 던진다
import { ApiError } from './core.js'

export const API_BASE = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'muruk.token' // 백엔드가 준 액세스 토큰 (리프레시 토큰은 이번 범위에 없음)

// 저장소가 막힌 브라우저(사생활 보호 모드 등)에서도 요청·로그아웃이 멈추지 않게 실패를 삼킨다
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null // 못 읽으면 로그인 안 한 것으로 본다
  }
}
export function setToken(t) {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    // 저장 못 하면 새로고침 뒤 다시 로그인해야 한다
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 지울 수 없어도 로그아웃 흐름은 이어 간다
  }
}

export async function request(method, path, body) {
  const token = getToken()
  let res
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // 서버가 꺼져 있거나 인터넷이 끊겼을 때
    throw new ApiError('NETWORK', '연결이 불안정해요. 잠시 후 다시 시도해 주세요.')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // 본문이 JSON이 아니면 아래에서 실패로 처리
  }
  if (!res.ok || !data?.isSuccess) {
    throw new ApiError(data?.code ?? `HTTP${res.status}`, data?.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.', { ...data?.result, status: res.status })
  }
  return data.result
}
