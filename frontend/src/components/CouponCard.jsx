import { Link } from 'react-router-dom'
import { mmdd, won } from '../utils/format.js'

// 쿠폰 카드 (가이드 2 — "앱의 얼굴"): 왼쪽 정보 / 점선 절취선 / 오른쪽 할인 금액(가장 크게)
// - coupon: { merchantName, value, minOrder, expiresAt, status }
// - caption: 맨 위 작은 글씨 (없으면 "연합 기획전 · 가게")
// - sub: 아래 조건 한 줄 (없으면 "15,000원 이상 · 12/01까지")
// - badge: 오른쪽 위 상태 칩 { label, tone } (없으면 쿠폰 상태에 맞춰 자동)
// - large: 상세 화면용 큰 카드
// - to: 누르면 갈 주소 (카드 전체가 누르는 영역)
// 사용 완료·만료·소멸은 회색 + 상태 칩 문구로 이유 표시 (색만으로 구분하지 않기)
// 배지 문구는 쿠폰 정책표 1번 시트 기준: 잠김 "구매 확정 후 사용", 사용 처리 중 "처리 중"
const AUTO_BADGE = {
  LOCKED: { label: '구매 확정 후 사용', tone: 'y' },
  PROCESSING: { label: '처리 중', tone: 'y' },
  USED: { label: '사용 완료', tone: 'g' },
  EXPIRED: { label: '만료', tone: 'g' },
  VOIDED: { label: '소멸', tone: 'g' },
}

function CouponCard({ coupon, caption, sub, badge, large, to }) {
  const dim = coupon.status === 'USED' || coupon.status === 'EXPIRED' || coupon.status === 'VOIDED'
  const chip = badge ?? AUTO_BADGE[coupon.status]
  const detail = sub ?? [coupon.minOrder ? `${won(coupon.minOrder)} 이상` : null, coupon.expiresAt ? `${mmdd(coupon.expiresAt)}까지` : null].filter(Boolean).join(' · ')

  const body = (
    <>
      <div className="l">
        <div className="top">
          <small>{caption ?? `연합 기획전 · ${coupon.merchantName}`}</small>
          {chip && <span className={`chip ${chip.tone}`}>{chip.label}</span>}
        </div>
        <b>
          {coupon.merchantName} {won(coupon.value)} 할인
        </b>
        <span className="sub">{detail}</span>
      </div>
      <div className="r">{won(coupon.value)}</div>
    </>
  )

  const cls = `cc ${dim ? 'dim' : ''} ${large ? 'lg' : ''}`
  return to ? (
    <Link className={cls} to={to}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export default CouponCard
