import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage.jsx'
import NotFoundPage from './pages/common/NotFoundPage.jsx'
// 역할별 화면 주소 목록 — 역할마다 파일이 따로라서, 역할 브랜치끼리 합쳐도 이 파일은 충돌하지 않는다
import { adminRoutes } from './routes/adminRoutes.jsx'
import { consumerRoutes } from './routes/consumerRoutes.jsx'
import { storeRoutes } from './routes/storeRoutes.jsx'

// 주소(URL)별로 어떤 화면을 보여줄지 정하는 곳
function App() {
  return (
    <Routes>
      {/* 시작 주소: 홈. 와이어프레임 v0 확정 정책 — 비회원도 둘러보고, 로그인은 구매·쿠폰함·MY 때 */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      {/* 로그인 (모든 역할 공통, [확정] 구글 로그인) */}
      <Route path="/login" element={<LoginPage />} />

      {/* 소비자 (휴대폰 폭) */}
      {consumerRoutes()}
      {/* 가맹점 콘솔 (PC) */}
      {storeRoutes()}
      {/* KCP 관리자 콘솔 (PC) */}
      {adminRoutes()}

      {/* 없는 주소 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
