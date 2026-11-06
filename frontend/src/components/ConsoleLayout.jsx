import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getMerchant, resetDemo } from '../api/api.js'
import { REAL_MODE } from '../api/mode.js'
import { getUser, logout } from '../auth/mockAuth.js'
import { useApi } from '../hooks/useApi.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import Icon from './Icon.jsx'

// PC 화면 틀 (가맹점 센터·KCP 관리자 공통, 목업 v3): 위쪽 바(로고·어디인지·계정) + 왼쪽 메뉴 + 오른쪽 내용(Outlet)
// Outlet = 주소에 맞는 하위 화면이 들어갈 자리
// - variant: 'store'(가맹점 센터) / 'kcp'(KCP 관리자)
// - menu: [{ to, label, icon }]
// - soon: 메뉴 아래 "준비 중" 항목 이름 (누를 수 없음)
function ConsoleLayout({ variant, menu, soon }) {
  const user = getUser()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false) // 계정 메뉴 펼침
  const [resetMode, setResetMode] = useState(null)
  // 가맹점이면 가게 이름·업종 ("봄꽃상회 (꽃·식물)")
  const { data: merchant } = useApi(() => (user.merchantId ? getMerchant(user.merchantId) : Promise.resolve(null)), [user.merchantId])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // 시연 도구 — mode: 'ready'(기획전 진행 중) / 'demo'(시연 시작 — KCP 가맹점 심사부터)
  async function handleReset() {
    await resetDemo(resetMode)
    window.location.reload()
  }

  const kcp = variant === 'kcp'
  const name = kcp ? 'NHN KCP 운영팀' : merchant ? `${merchant.name} (${merchant.category})` : user.name

  return (
    <div className="pc">
      {resetMode && <ConfirmDialog message="시연 데이터를 처음 상태로 되돌릴까요? 쿠폰·주문·기록이 모두 지워져요." confirmLabel="되돌리기" danger onConfirm={handleReset} onCancel={() => setResetMode(null)} />}
      <header className="gnb">
        <img src="/logo.png" alt="무럭무럭" />
        <span className={`where ${kcp ? 'kcp' : ''}`}>{kcp ? 'KCP 관리자' : '가맹점 센터'}</span>
        <div className="acct-wrap">
          <button className="acct" aria-expanded={open} onClick={() => setOpen(!open)}>
            <i>{kcp ? 'K' : user.name[0]}</i>
            {name} ⌄
          </button>
          {open && (
            <div className="acct-menu">
              <button onClick={handleLogout}>로그아웃</button>
            </div>
          )}
        </div>
      </header>
      <div className="frame">
        <nav className="side" aria-label={kcp ? 'KCP 관리자 메뉴' : '가맹점 센터 메뉴'}>
          {menu.map((m) => (
            // end: 하위 주소에서는 첫 메뉴가 같이 켜지지 않게
            <NavLink key={m.to} to={m.to} end>
              <Icon name={m.icon} size={18} />
              {m.label}
            </NavLink>
          ))}
          <div className="sep" />
          {soon && (
            <span className="nv">
              {soon} <span className="chip b">준비 중</span>
            </span>
          )}
          {/* 발표 리허설용 */}
          <div className="tools">
            {!REAL_MODE && (
              <>
                <span>시연 도구</span>
                <button className="text-link" onClick={() => setResetMode('ready')}>
                  데이터 처음으로 (기획전 진행 중)
                </button>
                <button className="text-link" onClick={() => setResetMode('demo')}>
                  시연 시작 상태로 (가맹점 심사부터)
                </button>
              </>
            )}
            <button className="text-link" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </nav>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ConsoleLayout
