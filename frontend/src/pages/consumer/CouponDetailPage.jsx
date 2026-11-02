import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { USE_CHECKS, calcDiscount, getCoupon, getProduct, redeemCoupon } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import MerchantMark from '../../components/MerchantMark.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import StatusView from '../../components/StatusView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

// 오늘부터 유효기간까지 남은 날 (D-30)
// 날짜끼리만 비교 (오늘 몇 시인지는 무시)
function dDay(dateText) {
  const today = new Date(new Date().toISOString().slice(0, 10))
  return Math.max(0, Math.round((new Date(dateText) - today) / 86400000))
}

// "2026-11-01 14:02" → "11/01"
const mmdd = (t) => (t ? t.slice(5, 10).replace('-', '/') : '')

// 쿠폰 확인 결과 목록 (와이어프레임 ⑨-c): 항목마다 통과 / 거절
function CheckList({ results, failedKey }) {
  return (
    <section className="card">
      <h3 className="h-sm">쿠폰 확인 결과</h3>
      <div className="rows">
        {USE_CHECKS.map((ch) => (
          <div className="row" key={ch.key}>
            <span>{ch.label}</span>
            {failedKey === ch.key ? <span className="chip sm c-bad">거절</span> : results[ch.key] ? <span className="chip sm c-ok">통과</span> : <span className="chip sm c-gray">—</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ⑦ 쿠폰 상세 → ⑧ B 가게 결제(가상) → ⑨ 사용 결과 / 재사용 거절 (소비자 와이어프레임 v0)
function CouponScreen({ couponId }) {
  const user = getUser()
  const { data, reload } = useApi(async () => {
    const coupon = await getCoupon(couponId)
    const product = coupon ? await getProduct(coupon.merchantId) : null
    return { coupon, product }
  }, [couponId])

  // phase: detail(상세) → order(결제) → checking(확인 중) → done(사용 완료) / rejected(사용 불가)
  const [phase, setPhase] = useState('detail')
  const [outcome, setOutcome] = useState(null)
  const busy = useRef(false) // 결제 버튼 연속 클릭 → 쿠폰 두 번 사용 시도 방지

  async function handleUse() {
    if (busy.current) return
    busy.current = true
    setPhase('checking')
    try {
      const r = await redeemCoupon(user.id, couponId, data.coupon.merchantId)
      setOutcome(r)
      setPhase('done')
    } catch (err) {
      setOutcome(err)
      setPhase('rejected')
    }
    busy.current = false
    reload()
  }

  if (!data) return <PhoneScreen title="쿠폰 상세" />
  const { coupon, product } = data
  if (!coupon) return <PhoneScreen title="쿠폰 상세">쿠폰을 찾을 수 없어요.</PhoneScreen>

  // ----- 확인 중 (블록체인 단계는 보여주지 않음) -----
  if (phase === 'checking') {
    return (
      <PhoneScreen title="사용 결과" back={false}>
        <StatusView kind="wait" title="쿠폰 사용을 확인하고 있어요" desc="결제 결과와 쿠폰 사용 기록을 맞춰보는 중이에요" />
        <p className="notice gray">이 화면을 닫아도 처리는 계속돼요. 결과는 쿠폰함에서 다시 확인할 수 있어요.</p>
      </PhoneScreen>
    )
  }

  // ----- ⑨ 사용 완료 -----
  if (phase === 'done') {
    const { order } = outcome
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <Link className="pill lg p-forest full" to="/coupons">
              쿠폰함으로
            </Link>
            {/* 시연 7장면: 같은 쿠폰을 다시 써 보면 거절 */}
            <button className="pill lg p-ghost full" onClick={handleUse}>
              같은 쿠폰 다시 써보기 (시연용)
            </button>
          </>
        }
      >
        <StatusView kind="ok" sound="pay" title="쿠폰을 사용했어요" desc={`${coupon.merchantName} 결제에 ${won(order.discount)} 할인이 적용됐어요`} />
        <CouponCard coupon={outcome.coupon} />
        <span className="chip c-gray" style={{ justifySelf: 'center' }}>
          사용 완료 · 다시 쓸 수 없어요
        </span>
        <div className="card rows">
          <div className="row">
            <span>할인</span>
            <b>{won(order.discount)}</b>
          </div>
          <div className="row">
            <span>결제</span>
            <b>{won(order.paid)}</b>
          </div>
          <div className="row">
            <span>할인 부담</span>
            <b>{coupon.merchantName}</b>
          </div>
        </div>
      </PhoneScreen>
    )
  }

  // ----- ⑨-d 사용 실패: 결제 승인 실패 (쿠폰은 그대로) -----
  if (phase === 'rejected' && outcome.code === 'PAYMENT_FAILED') {
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <button className="pill lg p-forest full" onClick={() => setPhase('order')}>
              다시 결제하기
            </button>
            <Link className="pill lg p-ghost full" to="/coupons">
              쿠폰함으로
            </Link>
          </>
        }
      >
        <StatusView kind="warn" sound="fail" title="쿠폰을 사용하지 못했어요" desc="결제 승인이 되지 않았어요" />
        <div className="card rows">
          <div className="row">
            <span>쿠폰</span>
            <b>
              {coupon.merchantName} {coupon.discountType === 'RATE' ? `${coupon.value}%` : won(coupon.value)}
            </b>
          </div>
          <div className="row">
            <span>쿠폰 상태</span>
            <b>그대로 남아 있어요</b>
          </div>
          <div className="row">
            <span>사유</span>
            <b>결제 승인 실패 (시연용)</b>
          </div>
        </div>
      </PhoneScreen>
    )
  }

  // ----- ⑨-c 재사용 거절 / ⑦-b 사용 불가 -----
  if (phase === 'rejected') {
    const reused = outcome.code === 'COUPON_ALREADY_USED'
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <Link className="pill lg p-forest full" to="/coupons">
              쿠폰함으로
            </Link>
            <Link className="pill lg p-ghost full" to={`/coupons/${couponId}/history`}>
              발급·사용 기록 보기
            </Link>
          </>
        }
      >
        <StatusView
          kind="bad"
          sound="fail"
          title={reused ? '이미 사용한 쿠폰이에요' : '쓸 수 없는 쿠폰이에요'}
          desc={`${reused ? `${mmdd(outcome.usedAt)} ${outcome.merchantName}에서 사용한 쿠폰이라 쓸 수 없어요.` : outcome.message} 결제는 진행되지 않았어요.`}
        />
        <CouponCard coupon={{ ...coupon, status: 'USED' }} />
        <CheckList results={outcome.checks} failedKey={outcome.failedKey} />
      </PhoneScreen>
    )
  }

  // ----- ⑧ B 가게 결제 (가상) -----
  if (phase === 'order') {
    const discount = calcDiscount(coupon, product.price)
    const enough = product.price >= coupon.minOrder
    return (
      <PhoneScreen
        title="주문 결제"
        foot={
          <button className="pill lg p-forest full" disabled={!enough} onClick={handleUse}>
            {won(product.price - discount)} 결제하기
          </button>
        }
      >
        <div className="hstack">
          <MerchantMark m={product} size="sm" />
          <div>
            <b className="ink">{product.merchantName}</b>
            <span className="tiny" style={{ display: 'block' }}>
              참여 가게 · 시연용 주문
            </span>
          </div>
        </div>
        <div className="card product">
          <span className="thumb" style={{ background: product.merchantColor }} aria-hidden="true" />
          <div className="grow">
            <b className="ink">{product.name}</b>
            <span className="tiny" style={{ display: 'block' }}>
              수량 1
            </span>
          </div>
          <b className="ink">{won(product.price)}</b>
        </div>
        <div className="card">
          <div className="row-top">
            <b className="ink">쿠폰</b>
            <span className="tiny" title="쿠폰 고르기는 준비 중이에요">
              변경
            </span>
          </div>
          <div className="applied">
            ✓ {coupon.merchantName} {coupon.discountType === 'RATE' ? `${coupon.value}%` : won(coupon.value)} 할인 적용
          </div>
        </div>
        <div className="card rows">
          <div className="row">
            <span>주문 금액</span>
            <b>{won(product.price)}</b>
          </div>
          <div className="row">
            <span>쿠폰 할인</span>
            <b>−{won(discount)}</b>
          </div>
          <div className="row total">
            <span>결제 금액</span>
            <b>{won(product.price - discount)}</b>
          </div>
        </div>
        {!enough && <p className="notice bad">최소 주문 금액 {won(coupon.minOrder)} 이상이어야 쿠폰을 쓸 수 있어요.</p>}
        <p className="notice gray">시연용 가상 결제예요 · 쿠폰 사용 처리는 실제로 기록돼요</p>
      </PhoneScreen>
    )
  }

  // ----- ⑦ 쿠폰 상세 -----
  const usable = coupon.status === 'AVAILABLE'
  return (
    <PhoneScreen
      title="쿠폰 상세"
      foot={
        usable ? (
          <button className="pill lg p-forest full" onClick={() => setPhase('order')}>
            {coupon.merchantName}에서 사용하기
          </button>
        ) : coupon.status === 'USED' ? (
          // 시연용: 이미 쓴 쿠폰을 다시 써서 거절 장면 보여주기
          <button className="pill lg p-ghost full" onClick={handleUse}>
            같은 쿠폰 다시 써보기 (시연용)
          </button>
        ) : (
          <button className="pill lg p-forest full" disabled>
            사용할 수 없는 쿠폰
          </button>
        )
      }
    >
      {coupon.status === 'EXPIRED' && (
        <p className="notice bad">
          지금 쓸 수 없는 쿠폰이에요 · 유효기간이 지났어요 ({mmdd(coupon.expiresAt)} 만료)
        </p>
      )}
      <CouponCard coupon={coupon} />
      <div className="hstack">
        <MerchantMark m={coupon} size="sm" />
        <div>
          <b className="ink">
            {coupon.merchantName} · {coupon.merchantCategory}
          </b>
          <span className="tiny" style={{ display: 'block' }}>
            {coupon.source === 'CAMPAIGN' ? coupon.title : '가게 쿠폰'}
          </span>
        </div>
      </div>
      <div className="card rows">
        <div className="row">
          <span>할인</span>
          <b>{coupon.discountType === 'RATE' ? `${coupon.value}% (최대 ${won(coupon.maxDiscount)})` : won(coupon.value)}</b>
        </div>
        <div className="row">
          <span>최소 주문</span>
          <b>{won(coupon.minOrder)} 이상</b>
        </div>
        <div className="row">
          <span>유효기간</span>
          <b>
            {mmdd(coupon.expiresAt)}까지{usable ? ` (D-${dDay(coupon.expiresAt)})` : ''}
          </b>
        </div>
        <div className="row">
          <span>사용처</span>
          <b>{coupon.merchantName}</b>
        </div>
        <div className="row">
          <span>사용 횟수</span>
          <b>1회</b>
        </div>
        <div className="row">
          <span>받은 경로</span>
          <b>
            {coupon.fromMerchantName} 구매 · {mmdd(coupon.issuedAt)}
          </b>
        </div>
        {coupon.status === 'USED' && (
          <div className="row">
            <span>상태</span>
            <b>사용 완료 · 다시 쓸 수 없어요</b>
          </div>
        )}
      </div>

      <details className="card notes">
        <summary>유의사항 보기</summary>
        <ul>
          <li>쿠폰은 현금으로 바꾸거나 나눠 쓸 수 없어요.</li>
          <li>{coupon.merchantName}에서 {won(coupon.minOrder)} 이상 주문할 때 쓸 수 있어요.</li>
        </ul>
      </details>

      {/* 지갑 주소 대신 '기록 확인' 링크만 (가정 G5) */}
      <Link className="card link-row" to={`/coupons/${couponId}/history`}>
        <span>발급·사용 기록 확인</span>
        <span aria-hidden="true">›</span>
      </Link>
    </PhoneScreen>
  )
}

// 주소의 쿠폰(:couponId)이 바뀌면 화면을 새로 만든다 (이전 쿠폰의 결과가 남지 않게)
function CouponDetailPage() {
  const { couponId } = useParams()
  return <CouponScreen key={couponId} couponId={couponId} />
}

export default CouponDetailPage
