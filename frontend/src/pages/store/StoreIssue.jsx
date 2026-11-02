import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIssuance, getStoreDashboard } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import ChainProgress from '../../components/ChainProgress.jsx'
import { runWithSteps } from '../../utils/runWithSteps.js'
import Ticket from '../../components/Ticket.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

const STEPS = ['지갑 서명', '거래 전송', '한도 확인', '블록 확정']

// 목업에 있던 "N번째 방문 시", "바로 배포(QR)", "우리 매장"은 오프라인 문구라 뺐다 (인수인계 문서)
const RECEIVE_OPTIONS = [
  { value: 'FIRST_PURCHASE', title: '첫 구매 시 자동', desc: '우리 가게 첫 구매 고객에게 발급' },
  { value: 'MIN_AMOUNT', title: '일정 금액 이상 구매 시', desc: '구매 금액 기준을 정해요' },
]

// 숫자 입력칸 (원 단위)
function MoneyInput({ id, value, onChange }) {
  return (
    <div className="inwrap">
      <input id={id} className="input" inputMode="numeric" value={value} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} />
      <span className="unit">원</span>
    </div>
  )
}

// 조건부 쿠폰 발행 (목업 m-console.html의 issue)
function StoreIssue() {
  const user = getUser()
  const { data, reload } = useApi(() => getStoreDashboard(user.merchantId), [user.merchantId])

  // 입력값 (처음 값은 목업의 "첫 구매 감사" 쿠폰)
  const [form, setForm] = useState({
    name: '첫 구매 감사',
    discountType: 'FIXED',
    value: 5000,
    maxDiscount: 5000,
    receive: 'FIRST_PURCHASE',
    receiveMin: 30000,
    minOrder: 20000,
    expiryDays: 30,
    qty: 20,
  })
  const [phase, setPhase] = useState('edit') // edit → issuing → done
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  // 입력값 한 개 바꾸기
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  if (!data) return null
  const m = data.merchant
  // 정액이면 최대 할인액 = 할인 금액
  const coupon = { ...form, maxDiscount: form.discountType === 'FIXED' ? form.value : form.maxDiscount }
  const total = coupon.maxDiscount * form.qty
  const over = total > m.remaining

  async function handleIssue() {
    setError('')
    setPhase('issuing')
    try {
      await runWithSteps(() => createIssuance(user.merchantId, coupon), STEPS.length, setStep)
      setPhase('done')
      reload()
    } catch (err) {
      setError(err.message)
      setPhase('edit')
    }
  }

  return (
    <>
      <header className="page-h">
        <span className="cap">조건부 발행</span>
        <h1>쿠폰 발행</h1>
        <p className="subtle">조건을 정하면 한도 안에서 바로 발행돼요 · 남은 한도 {won(m.remaining)}</p>
      </header>

      <div className="cols issue-cols">
        <section className="panel form-grid">
          <div className="field">
            <label htmlFor="is-name">쿠폰 이름</label>
            <input id="is-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <div className="section">
            <h3>혜택</h3>
            {/* [확정] 쿠폰은 정액권만 — 정률(%) 선택지 없음 */}
            <div className="mini-grid">
              <div className="field">
                <label htmlFor="is-value">할인 금액 (정액)</label>
                <MoneyInput id="is-value" value={form.value} onChange={(v) => set('value', v)} />
              </div>
            </div>
          </div>

          <div className="section">
            <h3>받는 조건</h3>
            <div className="opts two">
              {RECEIVE_OPTIONS.map((o) => (
                <button key={o.value} className={`opt ${form.receive === o.value ? 'sel' : ''}`} onClick={() => set('receive', o.value)}>
                  <span>
                    <b>{o.title}</b>
                    <span>{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="is-rmin">구매 금액 기준 (이상)</label>
              <MoneyInput id="is-rmin" value={form.receiveMin} onChange={(v) => set('receiveMin', v)} />
            </div>
          </div>

          <div className="section">
            <h3>사용 조건</h3>
            <div className="mini-grid">
              <div className="field">
                <label htmlFor="is-min">최소 주문 금액</label>
                <MoneyInput id="is-min" value={form.minOrder} onChange={(v) => set('minOrder', v)} />
              </div>
              <div className="field">
                <span className="lb">유효기간</span>
                <div className="seg">
                  {[7, 30].map((d) => (
                    <button key={d} className={form.expiryDays === d ? 'sel' : ''} onClick={() => set('expiryDays', d)}>
                      {d}일
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="tiny">사용처: 우리 가게 (온라인 스토어)</p>
          </div>

          <div className="section">
            <h3>수량</h3>
            <div className="stepper">
              <button onClick={() => set('qty', Math.max(1, form.qty - 1))} aria-label="수량 줄이기">
                −
              </button>
              <input className="input" inputMode="numeric" value={form.qty} aria-label="발행 수량" onChange={(e) => set('qty', Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))} />
              <button onClick={() => set('qty', form.qty + 1)} aria-label="수량 늘리기">
                +
              </button>
              <span className="subhead">장</span>
            </div>
            <p className="tiny">발행 총액 = 1장 최대 할인액 × 수량</p>
          </div>
        </section>

        <aside className="panel preview">
          <h2 className="h-sm">미리보기</h2>
          <Ticket coupon={{ ...coupon, merchantName: m.name, merchantColor: m.color, title: form.name }} />
          <div className="rows">
            <div className="row">
              <span>총액</span>
              <b>{won(total)}</b>
            </div>
            <div className="row">
              <span>발행 후 남는 한도</span>
              <b>{won(Math.max(0, m.remaining - total))}</b>
            </div>
          </div>

          {m.limit === 0 && <p className="notice bad">아직 발행 한도가 없어요. KCP 한도 등록 후 발행할 수 있어요.</p>}
          {m.limit > 0 && over && <p className="notice bad">남은 발행 한도를 초과했어요. 수량이나 할인액을 낮춰주세요.</p>}
          {error && <p className="notice bad">{error}</p>}

          {phase === 'edit' && (
            <button className="pill lg p-forest full" disabled={over || m.limit === 0 || !form.name} onClick={handleIssue}>
              발행하기 · 지갑 서명
            </button>
          )}
          {phase !== 'edit' && (
            <div className="chain-box">
              <ChainProgress steps={STEPS} step={step} />
            </div>
          )}
          {phase === 'done' && (
            <p className="notice mint">
              발행이 완료됐어요. <Link to="/store">대시보드에서 확인</Link>
            </p>
          )}
        </aside>
      </div>
    </>
  )
}

export default StoreIssue
