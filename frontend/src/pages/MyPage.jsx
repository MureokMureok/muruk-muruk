import { useNavigate } from 'react-router-dom'
import { getMyActivity, resetDemo } from '../api/api.js'
import { getUser, logout } from '../auth/mockAuth.js'
import PhoneScreen from '../components/PhoneScreen.jsx'
import { useApi } from '../hooks/useApi.js'
import { blockNo } from '../utils/format.js'

const PROVIDER = { payco: 'PAYCO', kakao: '카카오', google: 'Google' }

// MY (목업 c-home.html의 me 화면). 지갑 주소(0x…)는 보여주지 않는다 (중간발표 피드백)
function MyPage() {
  const user = getUser()
  const navigate = useNavigate()
  const { data: activity } = useApi(() => getMyActivity(user.id), [user.id])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleReset() {
    if (!window.confirm('시연 데이터를 처음 상태로 되돌릴까요? (쿠폰·주문·기록이 모두 지워져요)')) return
    await resetDemo()
    navigate('/home')
  }

  return (
    <PhoneScreen title="MY" back={false} tabs>
      <div className="profile">
        <span className="avatar">{user.name[0]}</span>
        <div>
          <h2>{user.name}</h2>
          <span className="tiny">{user.provider ? `${PROVIDER[user.provider]} 로그인` : '아이디 로그인'}</span>
        </div>
      </div>

      <div className="card forest">
        <b>내 쿠폰 지갑</b>
        <p className="tiny" style={{ color: 'var(--mint)' }}>
          로그인 계정에 연결돼 있어요. 비밀번호나 지갑 앱이 따로 필요 없어요.
        </p>
      </div>

      <section>
        <div className="sec-h">
          <h2>활동 기록</h2>
          <span className="lane on">온체인</span>
        </div>
        {activity && activity.length === 0 && <p className="tiny">아직 기록이 없어요.</p>}
        <div className="merchant-list">
          {(activity || []).map((a) => (
            <div className="lrow" key={a.block}>
              <div className="meta grow">
                <b>{a.label}</b>
                <span className="tiny">
                  {a.detail} · 블록 {blockNo(a.block)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className="pill lg p-ghost full" onClick={handleLogout}>
        로그아웃
      </button>
      <button className="text-link" onClick={handleReset}>
        시연 데이터 처음으로 (리허설용)
      </button>
    </PhoneScreen>
  )
}

export default MyPage
