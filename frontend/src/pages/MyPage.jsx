import { Link, useNavigate } from 'react-router-dom'
import { getMySummary, resetDemo } from '../api/api.js'
import { getUser, logout } from '../auth/mockAuth.js'
import PhoneScreen from '../components/PhoneScreen.jsx'
import { useApi } from '../hooks/useApi.js'
import { won } from '../utils/format.js'

const PROVIDER = { payco: 'PAYCO', kakao: '카카오', google: 'Google' }

// ⑪ MY (소비자 와이어프레임 v0)
// - 지갑 정보는 MY에도 표시하지 않음 (가정 G5)
// - 11/8 범위: 프로필·쿠폰함·설정·로그아웃만 동작, 나머지 메뉴는 자리만
function MyPage() {
  const user = getUser()
  const navigate = useNavigate()
  const { data: s } = useApi(() => getMySummary(user.id), [user.id])

  function handleLogout() {
    logout()
    navigate('/home', { replace: true })
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
          <h2>{user.name}님</h2>
          <span className="tiny">{user.provider ? `${PROVIDER[user.provider]} 로그인` : `아이디 ${user.id}`}</span>
        </div>
      </div>

      <div className="card stats">
        <div>
          <b>{s?.received ?? 0}장</b>
          <span className="tiny">받은 쿠폰</span>
        </div>
        <div>
          <b>{s?.used ?? 0}장</b>
          <span className="tiny">사용한 쿠폰</span>
        </div>
        <div>
          <b>{won(s?.saved ?? 0)}</b>
          <span className="tiny">아낀 금액</span>
        </div>
      </div>

      <nav className="menu-list" aria-label="MY 메뉴">
        <Link className="card link-row" to="/coupons">
          <span>쿠폰함</span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link className="card link-row" to="/me/settings">
          <span>설정</span>
          <span aria-hidden="true">›</span>
        </Link>
        {['알림 설정', '이용 안내', '고객센터'].map((m) => (
          <div className="card link-row disabled" key={m} title="준비 중이에요">
            <span>{m}</span>
            <span className="tiny">준비 중</span>
          </div>
        ))}
      </nav>

      <button className="text-link" style={{ justifySelf: 'start' }} onClick={handleLogout}>
        로그아웃
      </button>
      <button className="text-link" style={{ justifySelf: 'start' }} onClick={handleReset}>
        시연 데이터 처음으로 (리허설용)
      </button>
    </PhoneScreen>
  )
}

export default MyPage
