import { Navigate, Route, Routes } from 'react-router-dom'
import SplashScreen from './components/SplashScreen.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import SignupPage from './pages/auth/SignupPage.jsx'
import NotFoundPage from './pages/common/NotFoundPage.jsx'
// 역할별 화면 주소 목록 — 역할마다 파일이 따로라서, 역할 브랜치끼리 합쳐도 이 파일은 충돌하지 않는다
import { adminRoutes } from './routes/adminRoutes.jsx'
import { consumerRoutes } from './routes/consumerRoutes.jsx'
import { storeRoutes } from './routes/storeRoutes.jsx'

// 주소(URL)별로 어떤 화면을 보여줄지 정하는 곳
function App() {
  return (
    <>
      {/* 앱 시작 화면: 뒤에서 첫 화면을 그리는 동안 위를 덮고 있다가 사라진다 */}
      <SplashScreen />
      <Routes>
        {/* 시작 주소: 홈. 비회원도 둘러볼 수 있다 (처음 실행 때의 로그인 화면은 utils/startup.js, 닫으면 홈) */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        {/* 로그인 (모든 역할 공통, [확정] 구글 로그인) */}
        <Route path="/login" element={<LoginPage />} />
        {/* 회원가입 (구글 로그인했지만 무럭무럭 계정이 없을 때) */}
        <Route path="/signup" element={<SignupPage />} />

        {/* 소비자 (휴대폰 폭) */}
        {consumerRoutes()}
        {/* 가맹점 콘솔 (PC) */}
        {storeRoutes()}
        {/* KCP 관리자 콘솔 (PC) */}
        {adminRoutes()}

        {/* 없는 주소 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
