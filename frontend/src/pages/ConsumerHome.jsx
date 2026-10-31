import { Link } from 'react-router-dom'
import { benefitText, getCampaign, getMyCoupons } from '../api/api.js'
import { getUser } from '../auth/mockAuth.js'
import Icon from '../components/Icon.jsx'
import MerchantMark from '../components/MerchantMark.jsx'
import SproutIcon from '../components/SproutIcon.jsx'
import TabBar from '../components/TabBar.jsx'
import { useApi } from '../hooks/useApi.js'
import { md } from '../utils/format.js'

// 소비자 홈 (목업 c-home.html의 home 화면 기준)
// 목업과 다른 점: 예시 가게를 농수산물·꽃으로, 교환 마켓 카드는 MVP 확장 범위라 뺌
function ConsumerHome() {
  const user = getUser()
  const { data } = useApi(async () => {
    const [campaign, coupons] = await Promise.all([getCampaign(), getMyCoupons(user.id)])
    return { campaign, available: coupons.filter((c) => c.status === 'AVAILABLE').length }
  }, [user.id])

  const campaign = data?.campaign
  const others = campaign ? campaign.terms.length - 1 : 0

  return (
    <div className="phone-app">
      <header className="appbar">
        <div className="brand">
          <SproutIcon size={20} />
          무럭무럭
        </div>
        <button className="icon-btn" aria-label="알림">
          <Icon name="bell" />
        </button>
      </header>

      <main className="app-body">
        {campaign && (
          <>
            {/* 기획전 큰 카드 */}
            <article className="hero-card">
              <span className="cap">무럭무럭 연합 기획전</span>
              <h1>{campaign.title.replace(' 연합', '\n연합')}</h1>
              <span className="period">
                {md(campaign.startDate)} – {md(campaign.endDate)}
              </span>
              <p>
                {campaign.status === 'ACTIVE'
                  ? `한 곳에서 사면 다른 ${others}곳 쿠폰을 드려요.`
                  : '곧 시작해요. 참여 가게들이 조건을 정하고 있어요.'}
              </p>
              <div className="merchant-strip" aria-label="참여 가게">
                {campaign.terms.map((t) => (
                  <MerchantMark key={t.merchantId} m={t} />
                ))}
              </div>
              <Link className="pill full" to="/campaign">
                기획전 보기 <Icon name="chev" size={16} />
              </Link>
            </article>

            {/* 보유 쿠폰 요약 */}
            <div className="coupon-summary">
              <Icon name="ticket" size={26} />
              <div>
                <b>사용 가능한 쿠폰 {data.available}장</b>
                <span className="tiny">기획전 가게에서 사면 받을 수 있어요</span>
              </div>
              <Link to="/coupons">쿠폰함</Link>
            </div>

            {/* 참여 가게 목록 */}
            <section>
              <div className="sec-h">
                <h2>참여 가게</h2>
                <span className="tiny">{campaign.terms.length}곳</span>
              </div>
              <div className="merchant-list">
                {campaign.terms.map((t) => (
                  <Link className="lrow" key={t.merchantId} to={`/campaign/buy/${t.merchantId}`}>
                    <MerchantMark m={t} size="sm" />
                    <div className="meta">
                      <b>{t.merchantName}</b>
                      <span className="tiny">{t.merchantCategory}</span>
                    </div>
                    <span className="condition">{benefitText(t)}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <TabBar />
    </div>
  )
}

export default ConsumerHome
