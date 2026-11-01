import { Link } from 'react-router-dom'
import { won } from '../utils/format.js'

// 소비자 화면용 쿠폰 카드 (와이어프레임 v0의 쿠폰 모양: 왼쪽 설명 · 오른쪽 할인 크기)
// - coupon: { merchantName, merchantColor, discountType, value, maxDiscount, minOrder, expiresAt, title, status }
// - caption: 맨 위 작은 글씨 (없으면 "기획전 이름 · 가게")
// - sub: 아래 작은 글씨 (없으면 최소 주문·유효기간)
// - to: 누르면 갈 주소 (없으면 누를 수 없는 카드)
// 사용 완료·만료 쿠폰은 흐리게 표시 (와이어프레임 필수 구현)
function CouponCard({ coupon, caption, sub, to }) {
  const dim = coupon.status === 'USED' || coupon.status === 'EXPIRED'
  const amount = coupon.discountType === 'RATE' ? `${coupon.value}%` : won(coupon.value)
  const name = `${coupon.merchantName} ${coupon.discountType === 'RATE' ? `${coupon.value}% 할인` : `${won(coupon.value)} 할인`}`
  const detail =
    sub ??
    [
      coupon.discountType === 'RATE' ? `최대 ${won(coupon.maxDiscount)}` : null,
      coupon.minOrder ? `${won(coupon.minOrder)} 이상` : null,
      coupon.expiresAt ? `${coupon.expiresAt.slice(5).replace('-', '/')}까지` : null,
    ]
      .filter(Boolean)
      .join(' · ')

  const body = (
    <>
      <div className="benefit-main">
        <span className="cap">{caption ?? `${coupon.title ?? '연합 기획전'} · ${coupon.merchantName}`}</span>
        <b>{name}</b>
        <span className="tiny">{detail}</span>
      </div>
      <div className="benefit-value">{amount}</div>
    </>
  )

  const cls = `benefit-card ${dim ? 'dim' : ''}`
  const style = { '--accent': coupon.merchantColor }
  return to ? (
    <Link className={cls} style={style} to={to}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  )
}

export default CouponCard
