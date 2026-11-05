import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getMerchant } from '../../api/api.js'
import { getUser, logout } from '../../auth/mockAuth.js'
import ConsoleLayout from '../../components/ConsoleLayout.jsx'
import StatusView from '../../components/StatusView.jsx'
import Timeline from '../../components/Timeline.jsx'
import { useApi } from '../../hooks/useApi.js'

// 가맹점 센터 입구: KCP 심사 결과에 따라 보여줄 화면을 고른다
// - 승인: 가맹점 센터 / 심사 대기·반려: 안내 화면 (목업 K1 "승인된 가게만 참여")
function StoreGate({ menu, soon }) {
  const navigate = useNavigate()
  const user = getUser()
  // 진짜 백엔드로 로그인했으면 merchantStatus가 있다 (백엔드 값 APPLIED / ACTIVE / SUSPENDED)
  const real = Boolean(user.merchantStatus)
  const { data: merchant, loading, reload } = useApi(() => (real ? Promise.resolve({ name: user.name, status: user.merchantStatus }) : getMerchant(user.merchantId)), [real, user.name, user.merchantStatus, user.merchantId])
  const missing = !loading && !merchant // 시연 데이터를 처음으로 되돌려 가게가 사라진 경우

  useEffect(() => {
    if (missing) logout()
  }, [missing])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (loading && !merchant) return null
  if (missing) return <Navigate to="/login" replace />
  if (merchant.status === 'APPROVED') return <ConsoleLayout variant="store" menu={menu} soon={soon} />
  // 승인된 진짜 가맹점: 가맹점 센터 화면은 아직 모의 데이터라 가게 정보가 맞지 않는다. 화면을 연결할 때까지 안내만
  if (merchant.status === 'ACTIVE') {
    return (
      <div className="phone-app">
        <header className="topb">
          <h1>가맹점 센터</h1>
        </header>
        <main className="ct">
          <StatusView kind="empty" title="승인된 가맹점이에요" desc={`${merchant.name} 가맹점 센터 화면을 서버와 연결하는 중이에요.`} />
        </main>
        <div className="cta">
          <button className="btn g" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  const rejected = merchant.status === 'REJECTED'
  return (
    <div className="phone-app">
      <header className="topb">
        <h1>가맹점 센터</h1>
      </header>
      <main className="ct">
        {rejected ? (
          <StatusView kind="warn" title="참여 신청이 반려됐어요" desc={`${merchant.name}은(는) 지금 연합 기획전에 참여할 수 없어요.`} />
        ) : (
          <StatusView kind="wait" title="KCP가 심사하고 있어요" desc={`${merchant.name} 참여 신청을 확인하는 중이에요. 승인되면 가맹점 센터를 쓸 수 있어요.`}>
            <Timeline
              items={[
                { key: 1, tone: 'ok', title: '참여 신청 완료' },
                { key: 2, tone: 'w', title: 'KCP 심사 중' },
                { key: 3, tone: 'n', title: '승인되면 연합 기획전 참여' },
              ]}
            />
          </StatusView>
        )}
      </main>
      <div className="cta">
        {!rejected && !real && (
          <button className="btn" onClick={reload}>
            심사 결과 다시 확인
          </button>
        )}
        <button className="btn g" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

export default StoreGate
