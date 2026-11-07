import { Link } from 'react-router-dom'
import { getCampaign, getCouponOffers } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import Icon from '../../components/Icon.jsx'
import { SproutLoading } from '../../components/SproutLoading.jsx'
import TabBar from '../../components/TabBar.jsx'
import { useApi } from '../../hooks/useApi.js'
import { CAMPAIGN_IMAGE } from '../../utils/images.js'
import { minOrderText, period, won } from '../../utils/format.js'
import { MERCHANT_CATEGORY } from '../../utils/labels.js'

// 카테고리 (목업 C-01). 검색 대상이 기획전·가게·상품 이름이라 지금은 눌러지지 않는 표시만
const CATEGORIES = Object.values(MERCHANT_CATEGORY)

// 기획전이 진행 중이 아닐 때 배너에 붙이는 표시
const NOT_ACTIVE = { PREPARING: '시작 전', PAUSED: '일시 중지', ENDED: '종료' }

// C-01 소비자 홈 (목업 v3)
// 순서: 로고 → 검색 → 연합 기획전 배너 → 구매하면 받는 쿠폰 → 카테고리 → 떠 있는 탭
// 로그인 안 해도 볼 수 있다 (확정 정책: 비회원도 홈·기획전·쿠폰 정보 탐색 가능)
function ConsumerHome() {
  const { data: campaign, loading: campaignLoading } = useApi(() => getCampaign(), [])
  const userId = getUser()?.id
  const { data: offers } = useApi(() => getCouponOffers(userId), [userId])
  const available = offers?.filter((offer) => !offer.myCouponId) ?? []

  return (
    <div className="phone-app">
      <main className="ct large-top" style={{ gap: 20 }}>
        <img className="logo" src="/logo.png" alt="무럭무럭" />
        {/* 누르면 검색 화면으로 (쇼핑 앱처럼 검색은 따로 된 화면에서) */}
        <Link className="search" to="/search">
          <Icon name="search" size={18} />
          <span>기획전·가게·상품 검색</span>
        </Link>

        {campaignLoading && !campaign && <SproutLoading delay />}
        {!campaignLoading && !campaign && <p className="nb">지금 진행 중인 연합 기획전이 없어요. 기획전이 열리면 여기에서 알려 드릴게요.</p>}

        {campaign && (
          <>
            {/* 연합 기획전 배너 (홈 최상단 — 연합이라는 핵심 가치를 한 장으로) */}
            <section className="grp">
              <div className="sec-h">
                <h2>연합 기획전</h2>
                <Link to="/campaign">전체 보기</Link>
              </div>
              <Link className="ban" to="/campaign">
                <span style={{ display: 'flex', gap: 6 }}>
                  <span className="chip">
                    {period(campaign)} · 가게 {campaign.terms.length}곳
                  </span>
                  {NOT_ACTIVE[campaign.status] && <span className="chip">{NOT_ACTIVE[campaign.status]}</span>}
                </span>
                <div className="im">
                  <img src={CAMPAIGN_IMAGE} alt="" />
                </div>
                <h3>{campaign.title}</h3>
                <p>한 곳에서 사면 다른 가게 쿠폰을 드려요</p>
              </Link>
            </section>

            {/* 구매하면 받는 쿠폰 — 아직 받지 않은 쿠폰이라 "받기 전" */}
            <section className="grp">
              <div className="sec-h">
                <h2>구매하면 받는 쿠폰</h2>
                <Link to="/campaign">전체 보기</Link>
              </div>
              {campaign.terms.filter((t) => t.registered).map((t) => (
                <CouponCard
                  key={t.merchantId}
                  coupon={t}
                  badge={{ label: '받기 전', tone: 'y' }}
                  sub={`${won(t.minOrder)} 이상 · 구매하면 발급`}
                  to={`/campaign/coupon/${t.merchantId}`}
                />
              ))}
            </section>

            {available.length > 0 && (
              <section className="grp">
                <div className="sec-h">
                  <h2>가게 쿠폰 바로 받기</h2>
                  <Link to="/offers">전체 보기</Link>
                </div>
                {available.slice(0, 2).map((offer) => (
                  <CouponCard key={offer.id} coupon={offer} caption={offer.name} badge={{ label: '바로 받기', tone: 'y' }} sub={`${minOrderText(offer.minOrder)} · 받은 날부터 ${offer.validDays}일`} to="/offers" />
                ))}
              </section>
            )}

            {/* 카테고리 (표시만) */}
            <section className="grp">
              <div className="sec-h">
                <h2>카테고리</h2>
              </div>
              <div className="chs">
                {CATEGORIES.map((c) => (
                  <span key={c} aria-disabled="true">
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
