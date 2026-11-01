import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import SproutIcon from '../../components/SproutIcon.jsx'
import { DEMO_GOOGLE_ACCOUNTS, ROLES, homePathFor, loginWithGoogle } from '../../auth/mockAuth.js'

const ROLE_LABEL = { [ROLES.CONSUMER]: '소비자', [ROLES.STORE]: '가맹점', [ROLES.KCP]: 'KCP 관리자' }

// 로그인 화면 — [확정] 소비자·가맹점·KCP 관리자 모두 구글 로그인
// 구글 연동 전이라 "Google로 계속하기"를 누르면 시연용 계정 선택 목록이 나온다 (구글 계정 선택 화면 흉내)
// 로그인한 계정의 역할에 따라 소비자 홈 / 가맹점 콘솔 / KCP 콘솔로 이동
function LoginPage() {
  const navigate = useNavigate()
  // ?next=/주소 가 붙어 있으면 로그인 후 그 화면으로 돌아간다
  // (로그인이 필요한 화면에서 넘어온 경우)
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')

  const [choosing, setChoosing] = useState(false) // 계정 선택 목록을 보여줄지

  async function handlePick(accountId) {
    const user = await loginWithGoogle(accountId)
    // 돌아갈 곳이 있으면 거기로, 없으면 역할별 첫 화면으로
    // (다른 역할의 화면이면 그 화면의 문지기가 자기 역할 첫 화면으로 보내 줌)
    navigate(next || homePathFor(user.role), { replace: true })
  }

  return (
    <main className="phone login-body">
      {/* 닫기(X): 로그인 안 하고 둘러보기로 (와이어프레임 ⑤) */}
      <button className="icon-btn login-close" aria-label="닫기" onClick={() => navigate('/home')}>
        <Icon name="close" />
      </button>
      <div>
        <div className="login-mark">
          <SproutIcon />
          무럭무럭
        </div>
        <div className="login-copy">
          <h1>
            동네 가게 쿠폰을
            <br />
            한곳에서
          </h1>
          <p>로그인하면 쿠폰 지갑이 자동으로 만들어져요.</p>
          <p className="login-sub">지갑 앱 설치 없이 바로 쓸 수 있어요.</p>
        </div>
      </div>

      {choosing ? (
        <div className="login-actions">
          <div className="card account-picker">
            <span className="cap">계정 선택 · 시연용 구글 계정</span>
            {DEMO_GOOGLE_ACCOUNTS.map((a) => (
              <button key={a.id} className="account-row" onClick={() => handlePick(a.id)}>
                <span className="avatar">{a.name[0]}</span>
                <span className="grow">
                  <b>{a.name}</b>
                  <span className="tiny">{a.email}</span>
                </span>
                <span className="chip sm c-line">{ROLE_LABEL[a.role]}</span>
              </button>
            ))}
          </div>
          <button className="text-link" onClick={() => setChoosing(false)}>
            취소
          </button>
        </div>
      ) : (
        <div className="login-actions">
          <button className="pill lg p-ghost full google-btn" onClick={() => setChoosing(true)}>
            <span className="g-mark" aria-hidden="true">
              G
            </span>
            Google로 계속하기
          </button>
          <p className="tiny center">소비자·가맹점·KCP 관리자 모두 구글 계정으로 로그인해요</p>
        </div>
      )}
    </main>
  )
}

export default LoginPage
