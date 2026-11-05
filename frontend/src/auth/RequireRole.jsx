import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUser, homePathFor } from './mockAuth.js'

// 로그인·역할 검사 문지기. 안쪽 화면들(Outlet 자리)을 감싼다. (소비자·가맹점·KCP 공통)
// - 로그인 안 했으면 → 로그인 화면으로 (로그인 후 원래 화면으로 돌아오도록 next에 주소를 담음)
// - 역할이 다르면 (예: 소비자가 /admin 접근) → 자기 역할의 첫 화면으로
function RequireRole({ role }) {
  const location = useLocation()
  const user = getUser()
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}

export default RequireRole
