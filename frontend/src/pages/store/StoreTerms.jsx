import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getStoreCampaigns, saveTerms } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import Icon from '../../components/Icon.jsx'
import { useApi } from '../../hooks/useApi.js'
import { CAMPAIGN_STATUS, VALIDITY } from '../../utils/labels.js'
import { num, won } from '../../utils/format.js'
import { SproutLoading, SproutOverlay } from '../../components/SproutLoading.jsx'

// 숫자 입력칸: 쉼표를 붙여 보여주고, 숫자만 받아서 돌려준다 ("15,000" ↔ 15000)
function NumInput({ value, onChange, unit, label, disabled }) {
  return (
    <div className={`inp ${disabled ? 'lock' : ''}`}>
      <input inputMode="numeric" aria-label={label} value={num(value)} disabled={disabled} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} />
      <em>{unit}</em>
    </div>
  )
}

// M2 쿠폰 조건 설정 (목업 v3 가맹점 센터) — 다른 가게 손님이 받아 우리 가게에서 쓰는 쿠폰
// [확정] 돈을 미리 맡기지 않음: 할인 한도(상한)만 정하고, 쓰인 쿠폰만큼만 할인 부담
function TermsForm({ campaign: c, me, onSaved }) {
  const t = c.terms.find((x) => x.merchantId === me)
  const [form, setForm] = useState({ value: t.value, minOrder: t.minOrder, validity: t.validity, cap: t.cap })
  const [step, setStep] = useState(1) // 위쪽 1·2·3 단계 표시 (입력 중인 칸에 맞춰 바뀜)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  const locked = c.status !== 'PREPARING' // [가정] 시작된 기획전은 조건을 바꿀 수 없음
  const set = (key) => (v) => {
    setMsg(null)
    setForm({ ...form, [key]: v })
  }
  const others = c.terms.filter((x) => x.merchantId !== me).map((x) => x.merchantName)
  const qty = form.value > 0 ? Math.floor(form.cap / form.value) : 0
  const minBad = form.minOrder < form.value

  async function handleSave(register) {
    setBusy(true)
    setMsg(null)
    try {
      await saveTerms(me, c.id, form, register)
      setMsg({ ok: true, text: register ? '기획전에 등록했어요. 모든 가게가 등록하면 KCP가 시작을 승인해요.' : '임시 저장했어요. 아직 다른 가게에는 보이지 않아요.' })
      onSaved()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
    setBusy(false)
  }

  const st = t.registered ? { label: '등록 완료', tone: '' } : t.draft ? { label: '임시 저장됨', tone: 'y' } : { label: '등록 전', tone: 'g' }

  return (
    <>
      {busy && <SproutOverlay delay growing title="쿠폰 조건을 기록하고 있어요" />}
      <div className="ph1">
        <div className="tt">
          <h1>
            우리 가게 쿠폰 조건 <span className={`chip ${st.tone}`}>{st.label}</span>
          </h1>
          <p>{c.title}에서 다른 가게 손님이 받아 우리 가게에서 쓰는 쿠폰이에요</p>
        </div>
      </div>
      <div className="seg">
        {['할인', '사용 조건', '한도·확인'].map((s, i) => (
          <span key={s} className={step === i + 1 ? 'on' : ''}>
            <i>{i + 1}</i>
            {s}
          </span>
        ))}
      </div>
      {locked && <p className="nb warn">{CAMPAIGN_STATUS[c.status].label}인 기획전이라 조건을 바꿀 수 없어요. 등록한 조건을 보여드려요.</p>}

      <div className="split">
        <div className="col">
          <section className="card" onFocus={() => setStep(1)}>
            <div className="field">
              <div className="lb">
                <i>1</i>할인 금액
              </div>
              <NumInput label="할인 금액" value={form.value} onChange={set('value')} unit="원 할인" disabled={locked} />
              <p className="help">정액 할인만 지원해요. 쿠폰 1장에 이 금액만큼 결제 금액에서 빠져요</p>
            </div>
          </section>
          <section className="card" onFocus={() => setStep(2)}>
            <div className="field">
              <div className="lb">
                <i>2</i>최소 주문 금액
              </div>
              <NumInput label="최소 주문 금액" value={form.minOrder} onChange={set('minOrder')} unit="원 이상" disabled={locked} />
              <p className={`help ${minBad ? 'bad' : ''}`}>할인 금액보다 작게 입력할 수 없어요</p>
            </div>
            <div className="field">
              <div className="lb">유효기간</div>
              <div className="choice">
                {Object.entries(VALIDITY).map(([k, label]) => (
                  <button key={k} className={form.validity === k ? 'on' : ''} disabled={locked} onClick={() => set('validity')(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="lb">사용처</div>
              <div className="inp lock">
                <input value={`${t.merchantName} (우리 가게)`} aria-label="사용처" readOnly />
                <span className="chip g">고정</span>
              </div>
              <p className="help">연합 기획전 쿠폰은 우리 가게에서만 쓰여요</p>
            </div>
          </section>
          <section className="card" onFocus={() => setStep(3)}>
            <div className="field">
              <div className="lb">
                <i>3</i>할인 한도 (상한)
              </div>
              <NumInput label="할인 한도" value={form.cap} onChange={set('cap')} unit="원" disabled={locked} />
            </div>
            <div className="nb ok">
              <Icon name="shield" size={18} />
              <span>돈을 미리 맡기지 않아요. 쿠폰이 실제로 쓰였을 때만 할인 부담이 생겨요. 한도를 넘으면 우리 쿠폰만 발급이 멈추고 기획전은 계속돼요.</span>
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card">
            <h2>손님에게 이렇게 보여요</h2>
            <CouponCard coupon={{ merchantName: t.merchantName, value: form.value }} sub={`${won(form.minOrder)} 이상 · ${VALIDITY[form.validity]}`} />
          </section>
          <section className="card">
            <h2>요약</h2>
            <dl className="kv">
              <dt>최대 발급</dt>
              <dd>
                {qty}장 ({won(form.cap)} ÷ {won(form.value)})
              </dd>
              <dt>받는 방법</dt>
              <dd>{others.join(', ')}에서 구매</dd>
              <dt>할인 부담</dt>
              <dd>쓰인 쿠폰만 · 우리 가게</dd>
            </dl>
          </section>
          <section className="card mint">
            <h2 style={{ fontSize: 15 }}>쿠폰을 쓸 때 자동으로 확인해요</h2>
            <ul className="checks">
              {['쿠폰 주인인가', `${t.merchantName}에서 쓰는가`, '유효기간 안인가', `${won(form.minOrder)} 이상인가`, '아직 안 쓴 쿠폰인가'].map((x) => (
                <li key={x}>
                  <span>
                    <Icon name="check" size={12} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </section>
          {msg && <p className={`nb ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</p>}
          {!locked && (
            <>
              <button className="btn blk" disabled={busy || minBad} onClick={() => handleSave(true)}>
                {busy ? '기록하는 중…' : t.registered ? '바꾼 조건으로 다시 등록하기' : '기획전에 등록하기'}
              </button>
              {!t.registered && (
                <button className="btn g blk" disabled={busy} onClick={() => handleSave(false)}>
                  임시 저장
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// 참여 기획전이 여럿이면 위에서 고른다 (?c=기획전번호 로 바로 열 수도 있음 — 연합 기획전 화면의 "우리 쿠폰 조건 보기")
function StoreTerms() {
  const user = getUser()
  const me = user.merchantId
  const [params, setParams] = useSearchParams()
  const { data: list, reload } = useApi(() => getStoreCampaigns(me), [me])
  if (!list) return <SproutLoading delay />
  if (list.length === 0) return <p className="empty">참여 중인 기획전이 없어요</p>

  // 기본: 조건 등록이 필요한 기획전(준비 중) → 없으면 첫 번째
  const c = list.find((x) => x.id === params.get('c')) ?? list.find((x) => x.status === 'PREPARING' && !x.terms.find((t) => t.merchantId === me).registered) ?? list[0]

  return (
    <>
      {list.length > 1 && (
        <div className="tabs">
          {list.map((x) => (
            <button key={x.id} className={x.id === c.id ? 'on' : ''} onClick={() => setParams({ c: x.id })}>
              {x.title}
            </button>
          ))}
        </div>
      )}
      {/* key: 기획전을 바꾸면 입력칸을 그 기획전 값으로 새로 채움 */}
      <TermsForm key={c.id} campaign={c} me={me} onSaved={reload} />
    </>
  )
}

export default StoreTerms
