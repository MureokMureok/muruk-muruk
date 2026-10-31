import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ROLES, getUser, homePathFor } from './auth/mockAuth.js'
import LoginPage from './pages/LoginPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'

// 로그인·역할 검사 문지기.
// - 로그인 안 했으면 → 로그인 화면으로 (로그인 후 원래 화면으로 돌아오도록 next에 주소를 담음)
// - 역할이 다르면 (예: 소비자가 /admin 접근) → 자기 역할의 첫 화면으로
function RequireRole({ role, children }) {
  const location = useLocation()
  const user = getUser()
  if (!user) {
    const next = encodeURIComponent(location.pathname)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />
  return children
}

// 주소(URL)별로 어떤 화면을 보여줄지 정하는 곳
function App() {
  return (
    <Routes>
      {/* 시작 주소: 일단 로그인 화면으로. 로그인 전 홈 둘러보기 여부는 팀 확인 후 결정 */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/home"
        element={
          <RequireRole role={ROLES.CONSUMER}>
            <PlaceholderPage title="소비자 홈" />
          </RequireRole>
        }
      />
      <Route
        path="/store"
        element={
          <RequireRole role={ROLES.STORE}>
            <PlaceholderPage title="가맹점 콘솔" />
          </RequireRole>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireRole role={ROLES.KCP}>
            <PlaceholderPage title="KCP 관리자 콘솔" />
          </RequireRole>
        }
      />
      {/* 없는 주소는 시작 주소로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
