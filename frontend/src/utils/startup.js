import { getUser, homePathFor } from '../auth/mockAuth.js'

// 앱을 처음 실행할 때 할 일을 정하는 곳 (브라우저 탭을 새로 열 때 한 번)
// - 시작 화면을 보여줄지 정한다
// - 앱 입구(/, /home)로 들어왔으면 첫 화면을 정한다
//     로그인 안 함 → 로그인 화면 (닫기(X)를 누르면 비회원으로 홈)
//     로그인 함 → 역할별 첫 화면 (소비자 홈 / 가맹점 센터 / KCP 관리자)
// - 공유 링크처럼 다른 주소로 바로 들어왔으면 그 화면을 그대로 둔다 (로그인은 결제할 때)
// - 같은 탭에서 새로고침하면 아무것도 하지 않고 보던 화면을 그대로 보여준다
const SEEN_KEY = 'muruk.splashSeen'

let showSplash = false

// 시작 화면을 보여줄지 (components/SplashScreen.jsx가 읽음)
export const shouldShowSplash = () => showSplash

const isConsole = (path) => path.startsWith('/store') || path.startsWith('/admin')

// 이 탭에서 이미 실행했는지 확인하고, 처음이면 실행했다고 적어 둔다
function alreadyLaunched() {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return true
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // 저장소를 못 쓰는 환경이면 매번 처음 실행으로 본다
  }
  return false
}

// 화면을 그리기 전에 한 번 부른다 (main.jsx)
// 주소를 먼저 바꿔 두면 라우터가 처음부터 그 화면을 그려서, 홈이 잠깐 보였다 넘어가는 일이 없다
export function prepareLaunch() {
  let path = window.location.pathname
  // 가맹점·KCP 콘솔(PC) 주소로 바로 들어오면 시작 화면 없이 바로 시작
  if (isConsole(path) || alreadyLaunched()) return

  if (path === '/' || path === '/home') {
    const user = getUser()
    path = user ? homePathFor(user.role) : '/login'
    window.history.replaceState(null, '', path)
  }
  // 시작 화면은 소비자 앱에서만. 로그인해 둔 가맹점·KCP 계정은 콘솔로 바로 간다
  showSplash = !isConsole(path)
}
