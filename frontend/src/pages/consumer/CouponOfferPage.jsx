import { Link, useParams } from 'react-router-dom'
import { getCampaign } from '../../api/api.js'
import CouponCard from '../../components/CouponCard.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

// ⑩ 받을 수 있는 쿠폰 상세 (소비자 와이어프레임 v0) — 홈 "추천 혜택"에서 들어옴
// 아직 받지 않은 쿠폰: 직접 받기 버튼은 없고, 다른 가게에서 사면 자동으로 받는다 (가정 G1)
function CouponOfferPage() {
  const { merchantId } = useParams()
  const { data: c } = useApi(() => getCampaign(), [])
  if (!c) return <PhoneScreen title="쿠폰 상세" />

  const t = c.terms.find((x) => x.merchantId === merchantId)
  const from = c.terms.filter((x) => x.merchantId !== merchantId)

  return (
    <PhoneScreen
      title="쿠폰 상세"
      foot={
        <Link className="pill lg p-forest full" to={`/campaign/buy/${from[0].merchantId}`}>
          {from[0].merchantName} 상품 보러 가기
        </Link>
      }
    >
      <CouponCard coupon={{ ...t, title: c.title }} sub={`${won(t.minOrder)} 이상 · 받은 날부터 ${c.validDays}일`} />
      <span className="chip sm c-gray" style={{ justifySelf: 'start' }}>
        아직 받지 않은 쿠폰
      </span>

      <section className="card">
        <h3 className="h-sm">이렇게 받을 수 있어요</h3>
        <p className="tiny">아래 가게에서 구매하면 자동으로 받아요</p>
        <div className="stack" style={{ marginTop: 10 }}>
          {from.map((x) => (
            <Link className="card soft where-mini" key={x.merchantId} to={`/campaign/buy/${x.merchantId}`}>
              <div>
                <b>{x.merchantName}에서 구매</b>
                <span className="tiny">{x.merchantCategory}</span>
              </div>
              <span className="tiny">상품 보기 ›</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="card rows">
        <div className="row">
          <span>할인</span>
          <b>{t.discountType === 'RATE' ? `${t.value}% (최대 ${won(t.maxDiscount)})` : won(t.value)}</b>
        </div>
        <div className="row">
          <span>최소 주문</span>
          <b>{won(t.minOrder)} 이상</b>
        </div>
        <div className="row">
          <span>유효기간</span>
          <b>받은 날부터 {c.validDays}일</b>
        </div>
        <div className="row">
          <span>사용처</span>
          <b>{t.merchantName}</b>
        </div>
        <div className="row">
          <span>사용 횟수</span>
          <b>1회</b>
        </div>
      </div>

      <details className="card notes">
        <summary>유의사항 보기</summary>
        <ul>
          {/* 인수인계 문서 [확정]: 현금화·분할 사용 불가 */}
          <li>쿠폰은 현금으로 바꾸거나 나눠 쓸 수 없어요.</li>
          <li>구매한 가게의 기획전 쿠폰은 받지 않아요.</li>
        </ul>
      </details>
    </PhoneScreen>
  )
}

export default CouponOfferPage
