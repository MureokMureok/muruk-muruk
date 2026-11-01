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
            {/* 구글 공식 4색 G 로고 */}
            <svg className="g-mark" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google로 계속하기
          </button>
          <p className="tiny center">소비자·가맹점·KCP 관리자 모두 구글 계정으로 로그인해요</p>
        </div>
      )}
    </main>
  )
}

export default LoginPage
