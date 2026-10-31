import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../auth/mockAuth.js'

// 아직 안 만든 화면 자리. 로그인 후 역할별로 제대로 이동하는지 확인하는 용도.
// 소비자 홈·가맹점 콘솔·KCP 콘솔을 만들면 이 파일 대신 실제 화면으로 바꾼다.
function PlaceholderPage({ title }) {
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="phone placeholder">
      <span className="cap">준비 중인 화면</span>
      <h1>{title}</h1>
      <p>{user?.name}님으로 로그인했어요.</p>
      <button className="pill lg p-ghost full" onClick={() => navigate(-1)}>
        뒤로 가기
      </button>
      <button className="text-link" onClick={handleLogout}>
        로그아웃
      </button>
    </main>
  )
}

export default PlaceholderPage
