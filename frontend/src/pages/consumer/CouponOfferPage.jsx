import { Link, useParams } from 'react-router-dom'
import { getCampaign } from '../../api/api.js'
import CouponCard from '../../components/CouponCard.jsx'
import MissingScreen from '../../components/MissingScreen.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'
import { VALIDITY } from '../../utils/labels.js'
import { won } from '../../utils/format.js'

// C-10 받을 수 있는 쿠폰 상세 (목업 v3) — 홈 "구매하면 받는 쿠폰"에서 들어옴
// 아직 받지 않은 쿠폰: 직접 받기 버튼은 없고, 다른 가게에서 사면 자동으로 받는다
function CouponOfferPage() {
  const { merchantId } = useParams()
  const { data: c } = useApi(() => getCampaign(), [])
  if (!c) return <PhoneScreen title="쿠폰 상세" />

  const t = c.terms.find((x) => x.merchantId === merchantId && x.registered)
  if (!t) return <MissingScreen title="쿠폰 상세" message="찾을 수 없는 쿠폰이에요" to="/home" toLabel="홈으로" />
  const from = c.terms.filter((x) => x.merchantId !== merchantId)
  const validity = t.validity === 'END' ? VALIDITY.END : VALIDITY.DAYS30

  return (
    <PhoneScreen title="쿠폰 상세">
      <CouponCard coupon={t} large badge={{ label: '받기 전', tone: 'y' }} sub={`${won(t.minOrder)} 이상 · ${validity}`} />

      <section className="grp">
        <div>
          <h3 className="h4" style={{ fontSize: 17 }}>
            이렇게 받을 수 있어요
          </h3>
          <p className="cap" style={{ fontSize: 13, marginTop: 2 }}>
            아래 가게에서 구매하면 자동으로 받아요
          </p>
        </div>
        <div className="menu">
          {from.map((x) => (
            <Link key={x.merchantId} to={`/campaign/buy/${x.merchantId}`}>
              <span>
                {x.merchantName}에서 구매<small>{x.merchantCategory}</small>
              </span>
              <span className="go">상품 보기 ›</span>
            </Link>
          ))}
        </div>
      </section>

      <dl className="kv">
        <dt>할인</dt>
        <dd>{won(t.value)}</dd>
        <dt>최소 주문</dt>
        <dd>{won(t.minOrder)} 이상</dd>
        <dt>유효기간</dt>
        <dd>{validity}</dd>
        <dt>사용처</dt>
        <dd>{t.merchantName}</dd>
        <dt>사용 횟수</dt>
        <dd>1회</dd>
      </dl>

      <details className="nb">
        <summary>
          유의사항 보기 <span>⌄</span>
        </summary>
        <ul>
          {/* 인수인계 문서 [확정]: 현금화·분할 사용 불가 */}
          <li>쿠폰은 현금으로 바꾸거나 나눠 쓸 수 없어요.</li>
          <li>구매한 가게의 기획전 쿠폰은 받지 않아요.</li>
          <li>받은 쿠폰은 구매 확정 후 쓸 수 있고, 주문을 취소하면 사라져요.</li>
        </ul>
      </details>
    </PhoneScreen>
  )
}

export default CouponOfferPage
