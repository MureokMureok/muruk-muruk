import { Link } from 'react-router-dom'
import { getCampaign } from '../../api/api.js'
import MerchantMark from '../../components/MerchantMark.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'
import { md, won } from '../../utils/format.js'

// 쿠폰 혜택 짧게: "봄꽃상회 3,000원" / "바다찬 10%"
const shortBenefit = (t) => `${t.merchantName} ${t.discountType === 'RATE' ? `${t.value}%` : won(t.value)}`

// ② 연합 기획전 상세 (소비자 와이어프레임 v0)
// 핵심: "어디서 사면 → 어떤 쿠폰" 연결이 한눈에 보이게. 로그인 없이 볼 수 있음
function CampaignPage() {
  const { data: c } = useApi(() => getCampaign(), [])
  if (!c) return <PhoneScreen title="연합 기획전" />

  const active = c.status === 'ACTIVE'

  return (
    <PhoneScreen
      title="연합 기획전"
      foot={
        <Link className="pill lg p-forest full" to={`/campaign/buy/${c.terms[0].merchantId}`}>
          {c.terms[0].merchantName} 상품 보기
        </Link>
      }
    >
      <div className="campaign-visual rounded" aria-hidden="true">
        {c.terms.map((t) => (
          <MerchantMark key={t.merchantId} m={t} size="lg" />
        ))}
      </div>
      <div>
        <h2 className="title-lg">{c.title}</h2>
        <p className="tiny">
          {md(c.startDate)} – {md(c.endDate)} · 참여 가게 {c.terms.length}곳
        </p>
      </div>

      {!active && (
        <p className="notice">
          {c.status === 'REJECTED' ? '진행하지 않는 기획전이에요.' : '아직 시작 전이에요. 지금 구매하면 기획전 쿠폰은 발급되지 않아요.'}
        </p>
      )}

      {/* 어떻게 받나요 — 3단계 */}
      <section className="card">
        <h3 className="h-sm">어떻게 받나요</h3>
        <div className="how-steps">
          <div>
            <b>1</b>
            <span className="ink">참여 가게에서 구매</span>
            <span className="tiny">한 곳만 골라요</span>
          </div>
          <div>
            <b>2</b>
            <span className="ink">다른 가게 쿠폰 발급</span>
            <span className="tiny">자동으로 받아요</span>
          </div>
          <div>
            <b>3</b>
            <span className="ink">각 가게에서 사용</span>
            <span className="tiny">조건을 확인해요</span>
          </div>
        </div>
        <p className="tiny" style={{ marginTop: 10 }}>
          구매한 가게의 쿠폰은 받지 않아요
        </p>
      </section>

      {/* 어디서 사면 무엇을 받나요 */}
      <section>
        <div className="sec-h">
          <h2>어디서 사면 무엇을 받나요</h2>
        </div>
        <div className="stack">
          {c.terms.map((t) => {
            const gets = c.terms.filter((x) => x.merchantId !== t.merchantId)
            // 받을 쿠폰 중 가장 적게 남은 수량 (다 떨어지면 "쿠폰 마감", 구매는 가능)
            const left = Math.min(...gets.map((x) => x.qtyLeft))
            const total = Math.min(...gets.map((x) => x.qtyTotal))
            return (
              <Link className="card where-row" key={t.merchantId} to={`/campaign/buy/${t.merchantId}`}>
                <div className="row-top">
                  <b>{t.merchantName}에서 구매</b>
                  <span aria-hidden="true">›</span>
                </div>
                <span className="ink">→ {gets.map(shortBenefit).join(' + ')}</span>
                <div className="bar sm">
                  <i style={{ width: `${total ? (left / total) * 100 : 0}%` }} />
                </div>
                <span className="tiny right">{left > 0 ? `쿠폰 남은 수량 ${left}/${total}` : '쿠폰 마감 · 구매는 가능해요'}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="card soft hstack">
        <p className="tiny grow">쿠폰 규칙과 발급 및 사용 기록은 참여 가게가 함께 확인해요</p>
        {/* 로컬 시연에서 무엇을 보여줄지 미정 (와이어프레임 구현 체크) */}
        <span className="tiny" title="준비 중이에요">
          기록 확인 ›
        </span>
      </div>
    </PhoneScreen>
  )
}

export default CampaignPage
