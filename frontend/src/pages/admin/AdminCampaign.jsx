import { useState } from 'react'
import { benefitText, decideCampaign, getAdminCampaign } from '../../api/api.js'
import ChainProgress from '../../components/ChainProgress.jsx'
import { runWithSteps } from '../../utils/runWithSteps.js'
import MerchantMark from '../../components/MerchantMark.jsx'
import { useApi } from '../../hooks/useApi.js'
import { md, won } from '../../utils/format.js'
import { CAMPAIGN_STATUS } from '../../utils/labels.js'

const STEPS = ['관리자 서명', '거래 전송', '블록 확정']

// 체크 항목 한 줄
function CheckRow({ ok, label, okText = '확인', badText = '미충족' }) {
  return (
    <div className="row">
      <span>{label}</span>
      {ok ? <span className="sig">✓ {okText}</span> : <span className="chip sm c-wait">{badText}</span>}
    </div>
  )
}

// 기획전 승인·반려 (목업 a-console.html의 campaigns). KCP는 규칙을 못 바꾸고 승인·반려만
function AdminCampaign() {
  const { data: c, reload } = useApi(() => getAdminCampaign(), [])
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(0)

  if (!c) return null
  const signed = c.terms.filter((t) => t.signed).length
  const allSigned = signed === c.terms.length
  const allWhitelisted = c.terms.every((t) => t.whitelisted)
  const locked = c.status !== 'SIGNING'
  const st = CAMPAIGN_STATUS[c.status]

  async function decide(approve) {
    if (!approve && !window.confirm('기획전을 반려할까요? (시연 데이터 초기화 전까지 되돌릴 수 없어요)')) return
    setRunning(true)
    await runWithSteps(() => decideCampaign(approve), STEPS.length, setStep)
    await reload()
  }

  return (
    <>
      <header className="page-h">
        <span className="cap">KCP 관리자 · 운영 컨펌</span>
        <h1>기획전 승인</h1>
        <p className="subtle">가맹점 서명과 예산을 확인하고 승인·반려만 해요.</p>
      </header>

      <div className="cols">
        <section className="panel">
          <div className="panel-h">
            <div>
              <h2>{c.title}</h2>
              <span className="tiny">
                {md(c.startDate)}–{md(c.endDate)} · 참여 가게 {c.terms.length}곳
              </span>
            </div>
            <span className={`chip ${st.cls}`}>{st.label}</span>
          </div>
          <div className="rows">
            <CheckRow ok={allSigned} label={`참여 가게 서명 ${signed}/${c.terms.length}`} okText="모두 서명 완료" badText="서명 대기" />
            <CheckRow ok={allWhitelisted} label="참여 가게 모두 화이트리스트" />
            <CheckRow ok={allSigned} label="충전금 확보" badText="서명 후 확보" />
            <CheckRow ok={locked} label="규칙 잠금" okText="온체인" badText="잠금 전" />
          </div>

          {c.status === 'PENDING_APPROVAL' && !running && (
            <div className="hstack" style={{ marginTop: 16 }}>
              <button className="pill p-forest" onClick={() => decide(true)}>
                승인
              </button>
              <button className="pill p-danger" onClick={() => decide(false)}>
                반려
              </button>
            </div>
          )}
          {c.status === 'SIGNING' && <p className="notice" style={{ marginTop: 16 }}>모든 참여 가게가 서명해야 승인할 수 있어요.</p>}
          {running && (
            <div className="chain-box" style={{ marginTop: 16 }}>
              <ChainProgress steps={STEPS} step={step} />
            </div>
          )}
          <p className="tiny" style={{ marginTop: 12 }}>
            KCP는 승인·반려만 할 수 있어요. 잠긴 규칙(할인율·충전금)은 바꿀 수 없어요.
          </p>
        </section>

        <section className="panel">
          <h2 className="h-sm">가게별 잠긴 조건</h2>
          {c.terms.map((t) => (
            <div className="lrow" key={t.merchantId}>
              <MerchantMark m={t} size="sm" />
              <div className="meta grow">
                <b>{t.merchantName}</b>
                <span className="tiny">
                  {benefitText(t)} · 충전금 {won(t.fund)}
                </span>
              </div>
              {t.signed ? <span className="sig">✓</span> : <span className="chip sm c-wait">서명 전</span>}
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

export default AdminCampaign
