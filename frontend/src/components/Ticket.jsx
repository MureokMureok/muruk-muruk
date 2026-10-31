import { won } from '../utils/format.js'

// 쿠폰 한 장 모양 (목업의 .ticket). 왼쪽: 가게·조건, 오른쪽 점선 너머: 할인 크기
// coupon: { merchantName, merchantColor, title, discountType, value, maxDiscount, minOrder, status }
function Ticket({ coupon, as = 'div', onClick, caption }) {
  const Tag = as
  const used = coupon.status === 'USED'
  return (
    <Tag className={`ticket ${used ? 'used' : ''}`} style={{ background: coupon.merchantColor }} onClick={onClick}>
      <div className="tl">
        <span className="cap">{caption ?? coupon.title}</span>
        <b>{coupon.merchantName}</b>
        <span className="tiny ink">
          {coupon.minOrder ? `${won(coupon.minOrder)} 이상` : '최소 주문 없음'}
          {coupon.expiresAt ? ` · ${coupon.expiresAt.slice(5).replace('-', '/')}까지` : ''}
        </span>
      </div>
      <div className="tr">
        {coupon.discountType === 'RATE' ? (
          <>
            {coupon.value}
            <em>%</em>
            <small>최대 {won(coupon.maxDiscount)}</small>
          </>
        ) : (
          <>
            {coupon.value.toLocaleString('ko-KR')}
            <em>원</em>
          </>
        )}
      </div>
    </Tag>
  )
}

export default Ticket
