import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import SproutIcon from '../components/SproutIcon.jsx'
import TabBar from '../components/TabBar.jsx'
import { CAMPAIGN, MERCHANTS, MY_COUPON_COUNT } from '../data/mockCampaign.js'

// 가게 이름 첫 글자를 색 상자에 넣은 작은 아이콘
function MerchantMark({ merchant, size }) {
  return (
    <span className={`mk ${size}`} style={{ background: merchant.color }}>
      {merchant.short}
    </span>
  )
}

// 소비자 홈 (목업 c-home.html의 home 화면 기준)
// 목업과 다른 점: 예시 가게를 농수산물·꽃으로, 교환 마켓 카드는 MVP 확장 범위라 뺌
function ConsumerHome() {
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
        {/* 기획전 큰 카드 */}
        <article className="hero-card">
          <span className="cap">무럭무럭 연합 기획전</span>
          <h1 style={{ whiteSpace: 'pre-line' }}>{CAMPAIGN.title}</h1>
          <span className="period">{CAMPAIGN.period}</span>
          <p>{CAMPAIGN.summary}</p>
          <div className="merchant-strip" aria-label="참여 가게">
            {MERCHANTS.map((m) => (
              <MerchantMark key={m.id} merchant={m} />
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
            <b>보유 쿠폰 {MY_COUPON_COUNT}장</b>
            <span className="tiny">기획전에 참여하면 받을 수 있어요</span>
          </div>
          <Link to="/coupons">쿠폰함</Link>
        </div>

        {/* 참여 가게 목록 */}
        <section>
          <div className="sec-h">
            <h2>참여 가게</h2>
            <span className="tiny">{MERCHANTS.length}곳</span>
          </div>
          <div className="merchant-list">
            {MERCHANTS.map((m) => (
              <div className="lrow" key={m.id}>
                <MerchantMark merchant={m} size="sm" />
                <div className="meta">
                  <b>{m.name}</b>
                  <span className="tiny">{m.category}</span>
                </div>
                <span className="condition">{m.condition}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <TabBar />
    </div>
  )
}

export default ConsumerHome
