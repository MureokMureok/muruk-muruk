// 다크 모드 설정 — 스위치 2개
// 1) 시스템 설정에 맞추기: 켜면 휴대폰·PC가 다크 모드일 때 어둡게 (시스템 설정이 바뀌면 바로 따라감)
// 2) 다크 모드: '시스템 설정에 맞추기'가 꺼져 있을 때 직접 켜고 끔
// 기본값은 둘 다 끔 → 항상 밝게
// 화면 색 바꾸기는 <html data-theme="dark"> 표시를 보고 CSS(styles/app.css 맨 아래)가 처리한다.

const FOLLOW_KEY = 'muruk.followSystemTheme'
const DARK_KEY = 'muruk.darkMode'
// 시스템이 다크 모드인지 알려주는 도구. 오래된 웹뷰에는 없어서, 없으면 항상 밝은 모드로 본다
const media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null

function read(key) {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false // 저장소를 못 쓰는 환경이면 기본값(끔)
  }
}

function write(key, on) {
  try {
    localStorage.setItem(key, String(on))
  } catch {
    // 저장 실패해도 이번 화면에는 적용
  }
  applyTheme()
}

export const getFollowSystem = () => read(FOLLOW_KEY)
export const setFollowSystem = (on) => write(FOLLOW_KEY, on)
export const getDarkMode = () => read(DARK_KEY)
export const setDarkMode = (on) => write(DARK_KEY, on)

// 지금 시스템이 다크 모드인지 (설정 화면 안내용)
export const systemIsDark = () => media?.matches ?? false

// 시스템 다크/라이트가 바뀔 때 알려 달라고 등록. 돌려준 함수를 부르면 등록 해제
export function onSystemChange(fn) {
  media?.addEventListener('change', fn)
  return () => media?.removeEventListener('change', fn)
}

export function applyTheme() {
  // 시스템 따르기가 켜져 있으면 시스템 설정, 아니면 직접 고른 다크 모드
  const dark = getFollowSystem() ? systemIsDark() : getDarkMode()
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

// 앱 시작 시 한 번 호출: 지금 상태 적용 + 시스템 설정이 바뀌면 다시 적용
export function initTheme() {
  applyTheme()
  media?.addEventListener('change', applyTheme)
}
