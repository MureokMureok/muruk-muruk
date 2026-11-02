import { Link } from 'react-router-dom'
import { getCampaign } from '../../api/api.js'
import CouponCard from '../../components/CouponCard.jsx'
import Icon from '../../components/Icon.jsx'
import MerchantMark from '../../components/MerchantMark.jsx'
import TabBar from '../../components/TabBar.jsx'
import { useApi } from '../../hooks/useApi.js'
import { md, won } from '../../utils/format.js'

// 카테고리 (와이어프레임 ①). 11/8 시연 범위에 넣을지 팀 논의 중이라 지금은 눌러지지 않는 표시만
const CATEGORIES = ['꽃·식물', '제철 과일', '수산물', '농산물', '반찬·밀키트']

// 소비자 홈 — 소비자 와이어프레임 v0의 ① 홈 기준 (색은 무럭무럭 테마 유지)
// 순서: 상단(로고·검색) → 연합 기획전 배너 → 추천 혜택 → 카테고리 → 하단 탭
// 로그인 안 해도 볼 수 있다 (확정 정책: 비회원도 홈·기획전·쿠폰 정보 탐색 가능)
function ConsumerHome() {
  const { data: campaign } = useApi(() => getCampaign(), [])
  const active = campaign?.status === 'ACTIVE'

  return (
    <div className="phone-app">
      {/* 상단: 로고·한 줄 소개·검색 */}
      <header className="home-top">
        <div className="home-top-row">
          <div>
            <h1 className="home-logo">무럭무럭</h1>
            <p className="home-tagline">작은 가게들이 함께 무럭무럭</p>
          </div>
          <button className="icon-btn on-dark" aria-label="알림">
            <Icon name="bell" />
          </button>
        </div>
        {/* 검색은 시연 범위 밖이라 비활성 (와이어프레임 구현 체크) */}
        <label className="search-box" title="검색은 준비 중이에요">
          <input placeholder="가게·상품 검색" disabled />
          <Icon name="search" size={18} />
        </label>
      </header>

      <main className="app-body">
        {campaign && (
          <>
            {/* 연합 기획전 배너 (최상단 노출 — 필수 구현) */}
            <section>
              <div className="sec-h">
                <h2>연합 기획전</h2>
                <Link to="/campaign">전체 보기</Link>
              </div>
              <article className="campaign-card">
                {/* 이미지 자리: 가게 이미지가 없을 때 기본 그림 (참여 가게 마크) */}
                <div className="campaign-visual" aria-hidden="true">
                  {campaign.terms.map((t) => (
                    <MerchantMark key={t.merchantId} m={t} size="lg" />
                  ))}
                </div>
                <div className="campaign-body">
                  <div className="hstack">
                    <span className="tiny">
                      {md(campaign.startDate)} – {md(campaign.endDate)}
                    </span>
                    {!active && <span className="chip sm c-wait">시작 전</span>}
                  </div>
                  <h3>{campaign.title}</h3>
                  <p className="tiny">한 곳에서 사면 다른 가게 쿠폰을 드려요</p>
                  <div className="hstack merchant-chips">
                    {campaign.terms.map((t) => (
                      <MerchantMark key={t.merchantId} m={t} size="xs" />
                    ))}
                    <span className="tiny">참여 가게 {campaign.terms.length}곳</span>
                  </div>
                  <Link className="pill p-forest full" to="/campaign">
                    기획전 보기
                  </Link>
                </div>
              </article>
            </section>

            {/* 추천 혜택: 기획전에서 받을 수 있는 쿠폰과 받는 방법 */}
            <section>
              <div className="sec-h">
                <h2>추천 혜택</h2>
                <Link to="/campaign">전체 보기</Link>
              </div>
              <div className="stack">
                {campaign.terms.map((t) => {
                  // 이 쿠폰은 "다른" 가게에서 사면 받는다
                  const from = campaign.terms.filter((x) => x.merchantId !== t.merchantId).map((x) => x.merchantName)
                  return (
                    <CouponCard
                      key={t.merchantId}
                      coupon={{ ...t, title: campaign.title }}
                      sub={`${won(t.minOrder)} 이상 · 받는 법: ${from.join('·')}에서 구매`}
                      to={`/campaign/coupon/${t.merchantId}`}
                    />
                  )
                })}
              </div>
            </section>

            {/* 카테고리 (표시만) */}
            <section>
              <div className="sec-h">
                <h2>카테고리</h2>
              </div>
              <div className="category-chips">
                {CATEGORIES.map((c) => (
                  <span key={c} className="chip c-line" aria-disabled="true">
                    {c}
                  </span>
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
