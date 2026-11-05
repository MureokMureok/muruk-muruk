import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { SproutOverlay } from '../../components/SproutLoading.jsx'
import { GOOGLE_CLIENT_ID, renderGoogleButton } from '../../auth/googleSignIn.js'
import { homePathFor, loginWithGoogle, loginWithIdToken } from '../../auth/mockAuth.js'

// 로그인 화면 (목업 v3 C-05: 연두 바탕 + 로고 카드) — [확정] 소비자·가맹점·KCP 관리자 모두 구글 로그인
// 구글 로그인 → 데이터베이스에 있는 계정이면 역할 화면(소비자 홈 / 가맹점 센터 / KCP 관리자)으로, 없으면 회원가입으로
// 구글 클라이언트 ID가 설정되기 전에는 구글 이메일을 직접 입력해서 같은 흐름을 확인한다 (임시)
// 계정 확인은 auth/mockAuth.js가 처리 (백엔드 주소가 있으면 진짜 백엔드, 없으면 모의 데이터)
function LoginPage() {
  const navigate = useNavigate()
  // ?next=/주소 가 붙어 있으면 로그인 후 그 화면으로 돌아간다 (로그인이 필요한 화면에서 넘어온 경우)
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')

  const [emailOpen, setEmailOpen] = useState(false) // 임시 이메일 입력칸을 보여줄지
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false) // 계정 확인 중
  const googleBox = useRef(null) // 구글 버튼이 그려질 자리

  // 구글 로그인이 끝난 뒤: 계정 확인 → 알맞은 화면으로. login = 계정 확인을 부르는 함수
  const finish = useCallback(
    async (login) => {
      setError('')
      setChecking(true)
      try {
        const { registered, user } = await login()
        if (!registered) {
          // 계정이 없으면 회원가입으로 (돌아갈 곳도 같이 넘김)
          navigate(next ? `/signup?next=${encodeURIComponent(next)}` : '/signup', { replace: true })
          return
        }
        // 돌아갈 곳이 있으면 거기로, 없으면 역할별 첫 화면으로
        // (다른 역할의 화면이면 그 화면의 문지기가 자기 역할 첫 화면으로 보내 줌)
        navigate(next || homePathFor(user.role), { replace: true })
      } catch (err) {
        setError(err.message)
      }
      setChecking(false)
    },
    [navigate, next],
  )

  // 클라이언트 ID가 있으면 구글 공식 버튼을 그린다
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    renderGoogleButton(googleBox.current, (idToken) => finish(() => loginWithIdToken(idToken))).catch((err) => setError(err.message))
  }, [finish])

  function handleEmail(e) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('이메일 형식을 확인해 주세요.')
      return
    }
    finish(() => loginWithGoogle({ email: value, name: value.split('@')[0] }))
  }

  return (
    <div className="phone-app login">
      {checking && <SproutOverlay delay title="계정을 확인하고 있어요" />}
      <header className="topb">
        {/* 닫기(X): 로그인 안 하고 둘러보기로 */}
        <button className="bk" aria-label="닫기" onClick={() => navigate('/home')}>
          <Icon name="close" size={18} />
        </button>
      </header>
      <main className="ct">
        <div className="logo-card">
          <img src="/logo.png" alt="무럭무럭" />
        </div>
        <h2>
          동네 가게 쿠폰을
          <br />
          한곳에서
        </h2>
        <p>로그인하면 쿠폰 지갑이 자동으로 만들어져요.</p>
        <p className="sub">지갑 앱 설치 없이 바로 쓸 수 있어요.</p>
      </main>

      <div className="cta">
        {error && <p className="nb err">{error}</p>}
        {GOOGLE_CLIENT_ID ? (
          <div className="google-box" ref={googleBox} />
        ) : emailOpen ? (
          <form className="picker" noValidate onSubmit={handleEmail}>
            <span className="cap">구글 연동 설정 전 임시 입력이에요</span>
            <div className="inp">
              <input type="email" autoFocus aria-label="Google 이메일" placeholder="Google 이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" type="submit">
              계속하기
            </button>
            <button className="text-link center" type="button" onClick={() => setEmailOpen(false)}>
              취소
            </button>
          </form>
        ) : (
          <button className="btn google-btn" onClick={() => setEmailOpen(true)}>
            {/* 구글 공식 4색 G 로고 */}
            <svg className="g-mark" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google로 계속하기
          </button>
        )}
        <p className="hint">소비자·가맹점·KCP 관리자 모두 구글 계정으로 로그인해요</p>
      </div>
    </div>
  )
}

export default LoginPage
