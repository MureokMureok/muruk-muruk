import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { resetDemo } from '../api/api.js'
import { getUser, logout } from '../auth/mockAuth.js'
import SproutIcon from './SproutIcon.jsx'

// PC용 관리자 화면 틀 (가맹점 콘솔·KCP 콘솔 공통): 왼쪽 메뉴 + 오른쪽 내용(Outlet)
// Outlet = 주소에 맞는 하위 화면이 들어갈 자리
// - variant: 'store'(흰 메뉴) / 'kcp'(어두운 메뉴)
// - menu: [{ to, label }]
function ConsoleLayout({ variant, roleLabel, menu }) {
  const user = getUser()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // mode: 'ready'(기획전 진행 중) / 'demo'(시연 8장면 시작 — KCP 한도 등록부터)
  async function handleReset(mode) {
    if (!window.confirm('시연 데이터를 처음 상태로 되돌릴까요?')) return
    await resetDemo(mode)
    window.location.reload()
  }

  return (
    <div className={`console ${variant}`}>
      <aside className="side">
        <div className="brand">
          <SproutIcon size={22} />
          무럭무럭
        </div>
        <span className="chip sm c-lime role">{roleLabel}</span>
        <div className="who">
          <span className="avatar">{user.name[0]}</span>
          <div>
            <b>{user.name}</b>
            <span className="tiny">{variant === 'kcp' ? 'KCP 권한' : '가맹점 계정'}</span>
          </div>
        </div>
        <nav className="stack-sm" aria-label="메뉴">
          {menu.map((m) => (
            // end: 하위 주소에서는 '대시보드'가 같이 켜지지 않게
            <NavLink key={m.to} to={m.to} end className="nav">
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="foot">
          <button className="text-link" onClick={handleLogout}>
            로그아웃
          </button>
          <button className="text-link" onClick={() => handleReset('ready')}>
            데이터 처음으로 (기획전 진행 중)
          </button>
          <button className="text-link" onClick={() => handleReset('demo')}>
            8장면 시연 시작 상태로
          </button>
          <p>시연용 · 실제 결제·체인 연결 없음 (모의)</p>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export default ConsoleLayout
