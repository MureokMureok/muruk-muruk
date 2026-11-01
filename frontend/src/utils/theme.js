// 다크 모드 설정 — "시스템 설정에 맞추기" 하나만 있음
// - 켬: 휴대폰·PC가 다크 모드면 어둡게, 라이트면 밝게 (설정이 바뀌면 바로 따라감)
// - 끔(기본값): 항상 밝게
// 화면 색 바꾸기는 <html data-theme="dark"> 표시를 보고 CSS(styles/app.css 맨 아래)가 처리한다.

const KEY = 'muruk.followSystemTheme'
const media = window.matchMedia('(prefers-color-scheme: dark)') // 시스템이 다크 모드인지 알려주는 도구

export function getFollowSystem() {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false // 저장소를 못 쓰는 환경이면 기본값(밝게)
  }
}

export function setFollowSystem(on) {
  try {
    localStorage.setItem(KEY, String(on))
  } catch {
    // 저장 실패해도 이번 화면에는 적용
  }
  applyTheme()
}

export function applyTheme() {
  const dark = getFollowSystem() && media.matches
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

// 앱 시작 시 한 번 호출: 지금 상태 적용 + 시스템 설정이 바뀌면 다시 적용
export function initTheme() {
  applyTheme()
  media.addEventListener('change', applyTheme)
}
