import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SIMULATIONS, getMySummary, getSimulation, resetDemo, setSimulation } from '../../api/api.js'
import { getUser, logout } from '../../auth/mockAuth.js'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

// C-11 MY (목업 v3)
// - 지갑 정보는 MY에도 표시하지 않음
// - 11/8 범위: 프로필·쿠폰함·설정(다크 모드)·로그아웃만 동작, 나머지 메뉴는 자리만
// - 맨 아래 시연 도구 (발표용 — 목업에는 없음)
function MyPage() {
  const user = getUser()
  const navigate = useNavigate()
  const { data: s } = useApi(() => getMySummary(user.id), [user.id])

  function handleLogout() {
    logout()
    navigate('/home', { replace: true })
  }

  // mode: 'ready'(기획전 진행 중, 바로 쿠폰 받기) / 'demo'(시연 시작 — KCP 가맹점 심사부터)
  async function handleReset(mode) {
    if (!window.confirm('시연 데이터를 처음 상태로 되돌릴까요? (쿠폰·주문·기록이 모두 지워져요)')) return
    await resetDemo(mode)
    navigate('/home')
  }

  // 시연용 실패·멈춤 고르기 (다음 한 번만, 그 뒤 자동으로 정상)
  const [sim, setSim] = useState(getSimulation())
  function handleSim(e) {
    setSim(e.target.value)
    setSimulation(e.target.value)
  }

  return (
    <PhoneScreen large="MY" tabs>
      <div className="profile">
        <span className="avatar">{user.name[0]}</span>
        <div>
          <b>{user.name}님</b>
          <br />
          <span className="cap" style={{ fontSize: 12.5 }}>
            Google 로그인 · {user.email}
          </span>
        </div>
      </div>

      <div className="row3">
        <div>
          <b>{s?.received ?? 0}장</b>
          <small>받은 쿠폰</small>
        </div>
        <div>
          <b>{s?.used ?? 0}장</b>
          <small>사용한 쿠폰</small>
        </div>
        <div>
          <b>{won(s?.saved ?? 0)}</b>
          <small>아낀 금액</small>
        </div>
      </div>

      <nav className="menu" aria-label="MY 메뉴">
        <Link to="/coupons">
          <span>쿠폰함</span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link to="/me/settings">
          <span>설정</span>
          <span aria-hidden="true">›</span>
        </Link>
        {['알림 설정', '이용 안내', '고객센터'].map((m) => (
          <div className="soon" key={m} title="준비 중이에요">
            <span>{m}</span>
            <span className="cap">준비 중</span>
          </div>
        ))}
      </nav>

      <button className="logout" onClick={handleLogout}>
        로그아웃
      </button>

      {/* 발표 질의응답용: 실패·확인 중 화면을 보여줄 때 */}
      <section className="nb col tools">
        <span className="cap">시연 도구 (발표용)</span>
        <label style={{ width: '100%' }}>
          <span className="cap">실패·확인 중 상황 만들기 (연결 오류 말고는 한 번만)</span>
          <select value={sim} onChange={handleSim}>
            {SIMULATIONS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <button className="text-link" onClick={() => handleReset('ready')}>
          데이터 처음으로 (기획전 진행 중 · 바로 쿠폰 받기)
        </button>
        <button className="text-link" onClick={() => handleReset('demo')}>
          시연 시작 상태로 (KCP 가맹점 심사부터)
        </button>
      </section>
    </PhoneScreen>
  )
}

export default MyPage
