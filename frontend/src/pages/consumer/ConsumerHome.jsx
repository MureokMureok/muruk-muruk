import { Link } from 'react-router-dom'
import { getCampaign } from '../../api/api.js'
import CouponCard from '../../components/CouponCard.jsx'
import Icon from '../../components/Icon.jsx'
import TabBar from '../../components/TabBar.jsx'
import { useApi } from '../../hooks/useApi.js'
import { period, won } from '../../utils/format.js'

// 카테고리 (목업 C-01). 11/8 시연 범위 밖이라 지금은 눌러지지 않는 표시만
const CATEGORIES = ['꽃·식물', '제철 과일', '수산물', '농산물', '반찬']

// 기획전이 진행 중이 아닐 때 배너에 붙이는 표시
const NOT_ACTIVE = { PREPARING: '시작 전', PAUSED: '일시 중지', ENDED: '종료' }

// C-01 소비자 홈 (목업 v3)
// 순서: 로고 → 검색 → 연합 기획전 배너 → 구매하면 받는 쿠폰 → 카테고리 → 떠 있는 탭
// 로그인 안 해도 볼 수 있다 (확정 정책: 비회원도 홈·기획전·쿠폰 정보 탐색 가능)
function ConsumerHome() {
  const { data: campaign } = useApi(() => getCampaign(), [])

  return (
    <div className="phone-app">
      <main className="ct large-top" style={{ gap: 20 }}>
        <img className="logo" src="/logo.png" alt="무럭무럭" />
        {/* 검색은 시연 범위 밖이라 비활성 */}
        <label className="search" title="검색은 준비 중이에요">
          <Icon name="search" size={18} />
          <input placeholder="가게·상품 검색" disabled />
        </label>

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
                <div className="im">기획전 이미지</div>
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
              {campaign.terms.map((t) => (
                <CouponCard
                  key={t.merchantId}
                  coupon={t}
                  badge={{ label: '받기 전', tone: 'y' }}
                  sub={`${won(t.minOrder)} 이상 · 구매하면 발급`}
                  to={`/campaign/coupon/${t.merchantId}`}
                />
              ))}
            </section>

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
