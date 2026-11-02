import { useState } from 'react'
import { benefitText, getCampaign, getStoreDashboard, signCampaign } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import ChainProgress from '../../components/ChainProgress.jsx'
import { runWithSteps } from '../../utils/runWithSteps.js'
import MerchantMark from '../../components/MerchantMark.jsx'
import { useApi } from '../../hooks/useApi.js'
import { md, won } from '../../utils/format.js'
import { CAMPAIGN_STATUS } from '../../utils/labels.js'

const STEPS = ['조건 확인', '지갑 서명', '거래 전송', '블록 확정']

// 연합 기획전 조건 설정·서명 (목업 m-console.html의 campaign)
function StoreCampaign() {
  const user = getUser()
  const { data, reload } = useApi(async () => {
    const [campaign, dash] = await Promise.all([getCampaign(), getStoreDashboard(user.merchantId)])
    return { campaign, merchant: dash.merchant }
  }, [user.merchantId])

  const [draft, setDraft] = useState(null) // 내가 고치는 조건 (서명 전)
  const [phase, setPhase] = useState('edit')
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  if (!data) return null
  const { campaign: c, merchant: m } = data
  const mine = c.terms.find((t) => t.merchantId === user.merchantId)
  const terms = draft ?? mine // 고치기 시작 전에는 저장된 값
  const set = (key, value) => setDraft({ ...terms, [key]: value })
  const signedCount = c.terms.filter((t) => t.signed).length
  const st = CAMPAIGN_STATUS[c.status]

  async function handleSign() {
    setError('')
    setPhase('signing')
    try {
      const { value, minOrder, fund } = terms
      // 정액권만: 최대 할인액 = 할인 금액
      await runWithSteps(() => signCampaign(user.merchantId, { discountType: 'FIXED', value, maxDiscount: value, minOrder, fund }), STEPS.length, setStep)
      setDraft(null)
      setPhase('done')
      reload()
    } catch (err) {
      setError(err.message)
      setPhase('edit')
    }
  }

  const numInput = (key, label) => (
    <div className="field">
      <label htmlFor={`t-${key}`}>{label}</label>
      <input id={`t-${key}`} className="input" inputMode="numeric" value={terms[key]} onChange={(e) => set(key, Number(e.target.value.replace(/\D/g, '')) || 0)} />
    </div>
  )

  return (
    <>
      <header className="page-h">
        <span className="cap">연합 프로모션</span>
        <h1>{c.title}</h1>
        <div className="statusline">
          <span className="subtle">
            {md(c.startDate)} – {md(c.endDate)}
          </span>
          <span className={`chip sm ${st.cls}`}>{st.label}</span>
          <span className="chip sm c-line">
            서명 {signedCount}/{c.terms.length}
          </span>
        </div>
      </header>

      <section className="panel">
        <div className="panel-h">
          <h2>참여 가게 {c.terms.length}곳</h2>
          <span className="tiny">모든 가게가 서명하면 규칙이 잠기고 KCP 승인으로 넘어가요</span>
        </div>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>가게</th>
                <th>할인</th>
                <th>최소 주문</th>
                <th>충전금</th>
                <th>받아 줄 수 있는 쿠폰</th>
                <th>서명</th>
              </tr>
            </thead>
            <tbody>
              {c.terms.map((t) => (
                <tr key={t.merchantId} className={t.merchantId === user.merchantId ? 'me' : ''}>
                  <td>
                    <span className="hstack">
                      <MerchantMark m={t} size="sm" /> {t.merchantName}
                    </span>
                  </td>
                  <td>{benefitText(t)}</td>
                  <td>{won(t.minOrder)}</td>
                  <td>{won(t.fund)}</td>
                  <td>{Math.floor(t.fund / t.maxDiscount)}장</td>
                  <td>{t.signed ? <span className="sig">✓ 서명 완료</span> : <span className="chip sm c-wait">서명 전</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cols">
        <section className="panel form-grid">
          <h2 className="h-sm">우리 가게 조건</h2>
          {mine.signed ? (
            <>
              <p className="notice mint">서명을 마쳤어요. 잠긴 규칙은 KCP도 바꿀 수 없어요.</p>
              <div className="rows">
                <div className="row">
                  <span>할인</span>
                  <b>{benefitText(mine)}</b>
                </div>
                <div className="row">
                  <span>충전금</span>
                  <b>{won(mine.fund)}</b>
                </div>
                <div className="row">
                  <span>확보(발급된 쿠폰)</span>
                  <b>{won(mine.fundReserved)}</b>
                </div>
                <div className="row">
                  <span>실제 사용된 할인</span>
                  <b>{won(mine.fundUsed)}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* [확정] 쿠폰은 정액권만 — 정률(%) 선택지 없음 */}
              <div className="mini-grid">
                {numInput('value', '할인 금액 (정액, 원)')}
                {numInput('minOrder', '최소 주문 금액 (원)')}
                {numInput('fund', '충전금 (원)')}
              </div>
              <p className="tiny">충전금은 발행 한도에서 확보돼요 · 남은 한도 {won(m.remaining)}</p>
              {error && <p className="notice bad">{error}</p>}
              {phase === 'edit' && (
                <button className="pill lg p-forest full" disabled={c.status !== 'SIGNING'} onClick={handleSign}>
                  이 조건으로 서명하기
                </button>
              )}
            </>
          )}
          {phase !== 'edit' && (
            <div className="chain-box">
              <ChainProgress steps={STEPS} step={step} />
            </div>
          )}
          {phase === 'done' && c.status === 'PENDING_APPROVAL' && <p className="notice mint">모든 가게가 서명해 규칙이 잠겼어요. KCP 승인을 기다려요.</p>}
        </section>

        <section className="panel">
          <h2 className="h-sm">진행 방식</h2>
          <ol className="flow-list">
            <li>
              <span className="stepno">1</span>
              <div>
                <b>개설 제안</b>
                <span className="tiny">이름·기간·참여 조건을 정해요</span>
              </div>
            </li>
            <li>
              <span className="stepno">2</span>
              <div>
                <b>조건 서명</b>
                <span className="tiny">가게별 할인·충전금을 서명해요</span>
              </div>
            </li>
            <li>
              <span className="stepno">3</span>
              <div>
                <b>규칙 잠금</b>
                <span className="tiny">온체인에 규칙을 기록해요</span>
              </div>
            </li>
            <li>
              <span className="stepno">4</span>
              <div>
                <b>KCP 승인 → 진행</b>
                <span className="tiny">종료 후 남은 충전금은 돌려받아요</span>
              </div>
            </li>
          </ol>
          <p className="notice gray">충전금이 부족하면 우리 가게 쿠폰만 새로 발급되지 않아요. 기획전 전체는 계속돼요.</p>
        </section>
      </div>
    </>
  )
}

export default StoreCampaign
