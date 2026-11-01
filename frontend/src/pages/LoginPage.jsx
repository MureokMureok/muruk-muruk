import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import SproutIcon from '../components/SproutIcon.jsx'
import { homePathFor, loginWithId, loginWithSocial } from '../auth/mockAuth.js'

// 로그인 화면 (목업 c-home.html의 login 화면 기준)
// - 카카오·Google: 모의 로그인 → 소비자
// - 아이디 로그인: 시드 계정의 역할(소비자·가맹점·KCP)에 따라 각 화면으로 이동
function LoginPage() {
  const navigate = useNavigate()
  // ?next=/주소 가 붙어 있으면 로그인 후 그 화면으로 돌아간다
  // (로그인이 필요한 화면에서 넘어온 경우)
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')

  const [showIdForm, setShowIdForm] = useState(false) // 아이디 입력칸을 보여줄지
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // 로그인 성공 후 이동: 돌아갈 곳이 있으면 거기로, 없으면 역할별 첫 화면으로
  function goAfterLogin(user) {
    navigate(next || homePathFor(user.role), { replace: true })
  }

  async function handleSocial(provider) {
    const user = await loginWithSocial(provider)
    goAfterLogin(user)
  }

  async function handleIdSubmit(e) {
    e.preventDefault() // 폼 제출 시 페이지가 새로고침되는 기본 동작 막기
    setError('')
    try {
      const user = await loginWithId(id.trim(), password)
      goAfterLogin(user)
    } catch (err) {
      setError(err.message)
    }
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

      {showIdForm ? (
        <form className="login-actions" onSubmit={handleIdSubmit}>
          <div className="field">
            <label htmlFor="login-id">아이디</label>
            <input
              id="login-id"
              className="input"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="login-pw">비밀번호</label>
            <input
              id="login-pw"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="pill lg p-forest full" type="submit" disabled={!id || !password}>
            로그인
          </button>
          <button className="text-link" type="button" onClick={() => setShowIdForm(false)}>
            다른 방법으로 로그인
          </button>
        </form>
      ) : (
        <div className="login-actions">
          {/* PAYCO: NHN 서비스라 맨 위에 둠. 지금은 다른 소셜 버튼처럼 모의 로그인 */}
          <button className="pill lg p-payco full" onClick={() => handleSocial('payco')}>
            PAYCO로 계속하기
          </button>
          <button className="pill lg p-kakao full" onClick={() => handleSocial('kakao')}>
            카카오로 계속하기
          </button>
          <button className="pill lg p-ghost full" onClick={() => handleSocial('google')}>
            Google로 계속하기
          </button>
          <button className="text-link" onClick={() => setShowIdForm(true)}>
            아이디로 로그인
          </button>
        </div>
      )}
    </main>
  )
}

export default LoginPage
