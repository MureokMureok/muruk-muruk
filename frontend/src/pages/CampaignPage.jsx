import { Link } from 'react-router-dom'
import { benefitText, getCampaign } from '../api/api.js'
import MerchantMark from '../components/MerchantMark.jsx'
import PhoneScreen from '../components/PhoneScreen.jsx'
import { useApi } from '../hooks/useApi.js'
import { md, won } from '../utils/format.js'
import { CAMPAIGN_STATUS } from '../utils/labels.js'

// 연합 기획전 상세 (목업 c-campaign.html의 detail 화면)
function CampaignPage() {
  const { data: c } = useApi(() => getCampaign(), [])
  if (!c) return <PhoneScreen title="연합 기획전" />

  const active = c.status === 'ACTIVE'
  const st = CAMPAIGN_STATUS[c.status]

  return (
    <PhoneScreen title="연합 기획전" tabs>
      <article className="hero-card">
        <span className={`chip sm ${st.cls}`}>{st.label}</span>
        <h1>{c.title.replace(' 연합', '\n연합')}</h1>
        <span className="period">
          {md(c.startDate)} – {md(c.endDate)} · 참여 가게 {c.terms.length}곳
        </span>
      </article>

      <section className="card">
        <h2 className="h-sm">어떻게 받나요</h2>
        <ol className="flow-list">
          <li>
            <span className="stepno">1</span>
            <div>
              <b>참여 가게에서 구매</b>
              <span className="tiny">한 곳만 골라요</span>
            </div>
          </li>
          <li>
            <span className="stepno">2</span>
            <div>
              <b>나머지 {c.terms.length - 1}곳 쿠폰 자동 발급</b>
              <span className="tiny">구매한 가게 쿠폰은 받지 않아요</span>
            </div>
          </li>
          <li>
            <span className="stepno">3</span>
            <div>
              <b>각 가게에서 조건 확인 후 사용</b>
              <span className="tiny">최소 주문 금액·유효기간을 확인해요</span>
            </div>
          </li>
        </ol>
      </section>

      {!active && (
        <p className="notice">
          {c.status === 'REJECTED'
            ? 'KCP가 기획전을 반려했어요. 쿠폰이 발급되지 않아요.'
            : '아직 시작 전이에요. 지금 구매하면 기획전 쿠폰은 발급되지 않아요.'}
        </p>
      )}

      <section>
        <div className="sec-h">
          <h2>참여 가게</h2>
          <span className="tiny">남은 예산</span>
        </div>
        <div className="merchant-list">
          {c.terms.map((t) => (
            <Link className="lrow" key={t.merchantId} to={`/campaign/buy/${t.merchantId}`}>
              <MerchantMark m={t} />
              <div className="meta grow">
                <b>{t.merchantName}</b>
                <span className="tiny">
                  {benefitText(t)} · {won(t.minOrder)} 이상
                </span>
                <div className="bar sm" aria-label={`남은 예산 ${Math.round(t.fundLeftRate * 100)}%`}>
                  <i style={{ width: `${t.fundLeftRate * 100}%` }} />
                </div>
              </div>
              <span className="condition">구매 ›</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="notice mint">
        규칙은 참여 가게 {c.terms.length}곳이 서명해 잠가요. KCP도 바꿀 수 없어요. <span className="lane on">온체인</span>
      </p>
    </PhoneScreen>
  )
}

export default CampaignPage
