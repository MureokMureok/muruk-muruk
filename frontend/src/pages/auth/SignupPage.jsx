import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { USE_BACKEND, cancelSignUp, getPendingGoogle, signUpAsConsumer, signUpAsMerchant } from '../../auth/mockAuth.js'
import { safeNext } from '../../auth/safeNext.js'
import Icon from '../../components/Icon.jsx'
import { SproutOverlay } from '../../components/SproutLoading.jsx'
import StatusView from '../../components/StatusView.jsx'
import Timeline from '../../components/Timeline.jsx'

// 가맹점 업종: [화면 글자, 백엔드 값] (backend MerchantCategory)
const CATEGORIES = [
  ['꽃·식물', 'FLOWER_PLANT'],
  ['제철 과일', 'FRUIT'],
  ['수산물', 'SEAFOOD'],
  ['농산물', 'FARM_PRODUCE'],
  ['반찬·밀키트', 'SIDE_DISH'],
]

// 상단 바: 뒤로 + 제목 + 단계 표시
function SignupBar({ title, step, onBack }) {
  return (
    <header className="topb">
      <button className="bk" aria-label="뒤로" onClick={onBack}>
        <Icon name="back" size={18} />
      </button>
      <h1>{title}</h1>
      {step && <span className="chip g">{step}</span>}
    </header>
  )
}

// 글자 입력칸
function TextField({ label, help, value, onChange, ...rest }) {
  return (
    <div className="field">
      <div className="lb">{label}</div>
      <div className="inp">
        <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      </div>
      {help && <p className="help">{help}</p>}
    </div>
  )
}

// 하나 고르기 버튼들. options: [화면 글자, 값]
function Choice({ label, options, value, onChange }) {
  return (
    <div className="field">
      <div className="lb">{label}</div>
      <div className="choice">
        {options.map(([text, v]) => (
          <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

// 필수 동의 2개 (약관 본문은 아직 없어서 항목 이름만)
function Consent({ value, onChange }) {
  const items = [
    ['terms', '[필수] 이용약관 동의'],
    ['privacy', '[필수] 개인정보 수집·이용 동의'],
  ]
  return (
    <div className="consent">
      {items.map(([key, label]) => (
        <label key={key}>
          <input type="checkbox" checked={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.checked })} />
          {label}
        </label>
      ))}
    </div>
  )
}

// ----- 이용자 가입: 이름·동의 → 완료 -----
function ConsumerSignup({ google, next, onBack }) {
  const [name, setName] = useState(google.name)
  const [consent, setConsent] = useState({ terms: false, privacy: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setBusy(true)
    setError('')
    try {
      await signUpAsConsumer(name)
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="phone-app">
        <header className="topb">
          <h1>회원가입</h1>
        </header>
        <main className="ct">
          <StatusView kind="ok" title="가입이 끝났어요" desc={`${name.trim()}님, 쿠폰 지갑이 자동으로 만들어졌어요.`} />
        </main>
        <div className="cta flat">
          <Link className="btn" to={next || '/home'} replace>
            시작하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="phone-app">
      <SignupBar title="이용자 가입" onBack={onBack} />
      <main className="ct">
        {/* 진짜 백엔드는 구글 계정 이름을 그대로 쓴다 (이름 변경 API 없음) */}
        {USE_BACKEND ? (
          <div className="field">
            <div className="lb">이름</div>
            <div className="inp lock">
              <input value={name} aria-label="이름" readOnly />
            </div>
          </div>
        ) : (
          <TextField label="이름" value={name} onChange={setName} autoComplete="name" />
        )}
        <div className="field">
          <div className="lb">Google 계정</div>
          <div className="inp lock">
            <input value={google.email} aria-label="Google 계정" readOnly />
          </div>
        </div>
        <Consent value={consent} onChange={setConsent} />
        {error && <p className="nb err">{error}</p>}
      </main>
      <div className="cta flat">
        {busy && <SproutOverlay delay title="쿠폰 지갑을 준비하고 있어요" sub="거의 다 됐어요" />}
        <button className="btn" disabled={busy || !name.trim() || !consent.terms || !consent.privacy} onClick={handleSubmit}>
          {busy ? '가입하는 중…' : '가입하기'}
        </button>
      </div>
    </div>
  )
}

// ----- 가맹점 가입: 가게 정보·동의 → 신청 완료 (KCP 심사 대기) -----
function MerchantSignup({ onBack }) {
  const [form, setForm] = useState({ storeName: '', category: '', bizNumber: '' })
  const [consent, setConsent] = useState({ terms: false, privacy: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (key) => (v) => setForm({ ...form, [key]: v })

  async function handleSubmit() {
    setBusy(true)
    setError('')
    try {
      await signUpAsMerchant(form)
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="phone-app">
        <header className="topb">
          <h1>가맹점 가입</h1>
        </header>
        <main className="ct">
          <StatusView kind="ok" title="참여 신청을 받았어요" desc="KCP 심사가 끝나면 가맹점 센터를 쓸 수 있어요.">
            <Timeline
              items={[
                { key: 1, tone: 'ok', title: '참여 신청 완료' },
                { key: 2, tone: 'w', title: 'KCP 심사 중' },
                { key: 3, tone: 'n', title: '승인되면 연합 기획전 참여' },
              ]}
            />
          </StatusView>
        </main>
        <div className="cta flat">
          <Link className="btn" to="/store" replace>
            가맹점 센터로
          </Link>
        </div>
      </div>
    )
  }

  const bizOk = form.bizNumber.replace(/\D/g, '').length === 10
  const ready = form.storeName.trim() && form.category && bizOk && consent.terms && consent.privacy
  return (
    <div className="phone-app">
      <SignupBar title="가맹점 가입" onBack={onBack} />
      <main className="ct">
        <TextField label="가게 이름" maxLength={100} value={form.storeName} onChange={set('storeName')} />
        <Choice label="업종" options={CATEGORIES} value={form.category} onChange={set('category')} />
        <TextField label="사업자등록번호" help="숫자 10자리예요." inputMode="numeric" maxLength={12} value={form.bizNumber} onChange={set('bizNumber')} />
        <Consent value={consent} onChange={setConsent} />
        {error && <p className="nb err">{error}</p>}
      </main>
      <div className="cta flat">
        {busy && <SproutOverlay delay title="가맹점 신청을 보내고 있어요" />}
        <button className="btn" disabled={busy || !ready} onClick={handleSubmit}>
          {busy ? '신청하는 중…' : '참여 신청하기'}
        </button>
      </div>
    </div>
  )
}

// 회원가입 (구글 로그인은 됐지만 무럭무럭 계정이 없을 때 오는 화면)
// 처음에 이용자인지 가맹점인지 고르고, 고른 쪽의 단계로 이어진다
// KCP 관리자는 가입이 없다 (미리 만들어 둔 계정만)
function SignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [google] = useState(getPendingGoogle)
  const [kind, setKind] = useState(null) // null(고르는 중) / 'consumer' / 'merchant'

  // 구글 로그인을 거치지 않고 주소로 바로 들어오면 로그인 화면으로
  if (!google) return <Navigate to="/login" replace />

  if (kind === 'consumer') return <ConsumerSignup google={google} next={next} onBack={() => setKind(null)} />
  if (kind === 'merchant') return <MerchantSignup onBack={() => setKind(null)} />

  function handleCancel() {
    cancelSignUp()
    navigate('/login', { replace: true })
  }

  return (
    <div className="phone-app">
      <SignupBar title="회원가입" onBack={handleCancel} />
      <main className="ct">
        <div>
          <h2 className="ttl-l">어떻게 이용하시나요?</h2>
          <p className="cap" style={{ fontSize: 13, marginTop: 6 }}>
            {google.email} 계정은 아직 가입 전이에요
          </p>
        </div>
        <button className="role-card" onClick={() => setKind('consumer')}>
          <span className="avatar s">
            <Icon name="user" size={20} />
          </span>
          <span className="grow">
            <b>무럭무럭 이용자이신가요?</b>
            <small>동네 가게에서 사고, 다른 가게 쿠폰을 받아요</small>
          </span>
          <Icon name="chev" size={18} />
        </button>
        <button className="role-card" onClick={() => setKind('merchant')}>
          <span className="avatar s">
            <Icon name="link" size={20} />
          </span>
          <span className="grow">
            <b>무럭무럭 가맹점이신가요?</b>
            <small>우리 가게를 연합 기획전에 올려요. KCP 심사 후 이용할 수 있어요</small>
          </span>
          <Icon name="chev" size={18} />
        </button>
      </main>
    </div>
  )
}

export default SignupPage
