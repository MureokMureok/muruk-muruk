// 진짜 백엔드 호출 도구
// 백엔드 응답은 항상 { isSuccess, code, message, result } 모양이다 (노션 "공통 응답 및 예외 처리 규칙")
// 성공이면 result만 돌려주고, 실패면 code·message·status가 담긴 ApiError를 던진다
import { ApiError } from './core.js'

export const API_BASE = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'muruk.token' // 백엔드가 준 액세스 토큰 (리프레시 토큰은 이번 범위에 없음)

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

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
