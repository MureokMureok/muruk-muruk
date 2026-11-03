import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { USE_CHECKS, calcDiscount, getCoupon, getProduct, redeemCoupon } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import Icon from '../../components/Icon.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import StatusView from '../../components/StatusView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { dDay, mdhm, mmdd, won } from '../../utils/format.js'

// 쿠폰 확인 결과 5가지 (시연용 — 컨트랙트가 확인하는 항목을 보여줌): 항목마다 통과 / 거절
function CheckList({ results, failedKey }) {
  return (
    <div className="checklist">
      <h3>쿠폰 확인 결과</h3>
      {USE_CHECKS.map((ch) => (
        <div key={ch.key}>
          <span>{ch.label}</span>
          {failedKey === ch.key ? <span className="chip r">거절</span> : results[ch.key] ? <span className="chip">통과</span> : <span className="chip g">—</span>}
        </div>
      ))}
    </div>
  )
}

// 주문 금액 · 쿠폰 할인 · 결제 금액
function Amounts({ amount, discount }) {
  return (
    <div>
      <div className="line">
        <span>주문 금액</span>
        <span>{won(amount)}</span>
      </div>
      <div className="line c">
        <span>쿠폰 할인</span>
        <span>−{won(discount)}</span>
      </div>
      <div className="line t">
        <span>결제 금액</span>
        <span>{won(amount - discount)}</span>
      </div>
    </div>
  )
}

// C-07 쿠폰 상세 → C-08 B가게 결제(가상) → C-09 사용 완료 / 사용 확인 중 / 재사용 거절 / 사용 실패 / 사용 불가 (목업 v3)
function CouponScreen({ couponId }) {
  const user = getUser()
  const { data, reload } = useApi(async () => {
    const coupon = await getCoupon(couponId)
    const product = coupon ? await getProduct(coupon.merchantId) : null
    return { coupon, product }
  }, [couponId])

  // phase: detail(상세) → order(결제) → checking(확인 중) → done(사용 완료) / rejected(사용 못 함)
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
      // 시연용 "사용 확인 중에서 멈춤"이면 확인 중 화면에 그대로 둔다 (처리는 끝났음 → 쿠폰함에서 사용 완료로 보임)
      if (!r.pending) setPhase('done')
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
  const name = coupon.merchantName

  // ----- 쿠폰 사용 확인 중: 같은 쿠폰으로 다시 결제하지 않도록 -----
  if (phase === 'checking') {
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <Link className="btn" to="/coupons">
            쿠폰함에서 상태 보기
          </Link>
        }
      >
        <StatusView
          kind="wait"
          title="쿠폰 사용을 확인하고 있어요"
          desc={
            <>
              결제 결과와 쿠폰 사용 기록을
              <br />
              맞춰 보는 중이에요.
              <br />
              이 화면을 닫아도 처리는 계속돼요.
            </>
          }
        >
          <div className="nb warn">
            <b>같은 쿠폰으로 다시 결제하지 마세요.</b>
          </div>
        </StatusView>
      </PhoneScreen>
    )
  }

  // ----- C-09 쿠폰 사용 완료 -----
  if (phase === 'done') {
    const { order, leftCoupons: left } = outcome
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <Link className="btn" to="/coupons">
              쿠폰함으로
            </Link>
            {/* 시연 7장면: 같은 쿠폰을 다시 써 보면 거절 */}
            <button className="btn g" onClick={handleUse}>
              같은 쿠폰 다시 써보기 (시연용)
            </button>
          </>
        }
      >
        <StatusView kind="ok" top sound="pay" title="쿠폰을 사용했어요" desc={`${name} 결제에 ${won(order.discount)} 할인이 적용됐어요`} />
        <CouponCard coupon={outcome.coupon} sub="다시 쓸 수 없어요" />
        <Amounts amount={order.amount} discount={order.discount} />
        {left.length > 0 && (
          <Link className="nb ok row" to="/coupons">
            <span>{left.length === 1 ? `${left[0].merchantName} ${won(left[0].value)} 쿠폰이 1장 남아 있어요` : `사용할 수 있는 쿠폰이 ${left.length}장 남아 있어요`}</span>
            <b>›</b>
          </Link>
        )}
      </PhoneScreen>
    )
  }

  // ----- 쿠폰 사용 실패: 결제 승인 실패 (쿠폰은 그대로) -----
  if (phase === 'rejected' && outcome.code === 'PAYMENT_FAILED') {
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <button className="btn" onClick={() => setPhase('order')}>
              다시 결제하기
            </button>
            <Link className="btn g" to="/coupons">
              쿠폰함으로
            </Link>
          </>
        }
      >
        <StatusView kind="warn" sound="fail" title="쿠폰을 사용하지 못했어요" desc="결제가 승인되지 않았어요.">
          <div className="nb ok">
            <div>
              <b>쿠폰은 그대로 남아 있어요</b>
              <br />
              다시 결제할 때 그대로 사용할 수 있어요
            </div>
          </div>
          <CouponCard coupon={coupon} />
        </StatusView>
      </PhoneScreen>
    )
  }

  // ----- 쿠폰 재사용 거절 / 사용 불가 -----
  if (phase === 'rejected') {
    const reused = outcome.code === 'COUPON_ALREADY_USED'
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <Link className="btn" to="/coupons">
              쿠폰함으로
            </Link>
            <Link className="btn g" to={`/coupons/${couponId}/history`}>
              발급·사용 기록 보기
            </Link>
          </>
        }
      >
        <StatusView
          kind="bad"
          sound="fail"
          title={reused ? '이미 사용한 쿠폰이에요' : '쓸 수 없는 쿠폰이에요'}
          desc={
            reused ? (
              <>
                {mdhm(outcome.usedAt)} {outcome.merchantName}에서 사용된 쿠폰이라
                <br />
                쓸 수 없어요. 결제는 진행되지 않았어요.
              </>
            ) : (
              `${outcome.message} 결제는 진행되지 않았어요.`
            )
          }
        >
          <CouponCard coupon={{ ...coupon, status: 'USED' }} />
          {/* 시연용: 5가지 확인 중 어디서 막혔는지 */}
          <CheckList results={outcome.checks} failedKey={outcome.failedKey} />
        </StatusView>
      </PhoneScreen>
    )
  }

  // ----- C-08 B가게 결제 (가상) -----
  if (phase === 'order') {
    const discount = calcDiscount(coupon, product.price)
    const enough = product.price >= coupon.minOrder
    return (
      <PhoneScreen
        title="주문 결제"
        foot={
          <>
            <span className="demo">시연용 가상 결제예요. 실제 결제는 일어나지 않아요</span>
            <button className="btn" disabled={!enough} onClick={handleUse}>
              {won(product.price - discount)} 결제하기
            </button>
          </>
        }
      >
        <div className="grp">
          <div className="who">
            <span className="avatar s">{coupon.merchantShort}</span>
            <div>
              <b>{name}</b>
              <br />
              <span className="cap">참여 가게</span>
            </div>
          </div>
          <div className="line">
            <span>
              {product.name} <span className="cap">수량 1</span>
            </span>
            <b>{won(product.price)}</b>
          </div>
        </div>
        <div className="grp">
          <div className="sec-h">
            <h2 className="sm">쿠폰</h2>
            <span className="link" title="쿠폰 고르기는 준비 중이에요">
              변경
            </span>
          </div>
          <div className="nb ok row">
            <span>
              {name} {won(coupon.value)} 할인 적용
            </span>
            <Icon name="check" size={18} />
          </div>
        </div>
        <Amounts amount={product.price} discount={discount} />
        {!enough && <p className="nb err">{won(coupon.minOrder)} 이상부터 쓸 수 있어요</p>}
        <div className="nb warn">결제 후 쿠폰이 바로 사용 처리돼요</div>
      </PhoneScreen>
    )
  }

  // ----- C-07 쿠폰 상세 / 사용 불가 쿠폰(만료) -----
  const usable = coupon.status === 'AVAILABLE'
  const expired = coupon.status === 'EXPIRED'
  return (
    <PhoneScreen
      title="쿠폰 상세"
      foot={
        usable ? (
          <button className="btn y" onClick={() => setPhase('order')}>
            {name}에서 사용하기
          </button>
        ) : coupon.status === 'USED' ? (
          // 시연용: 이미 쓴 쿠폰을 다시 써서 거절 장면 보여주기
          <button className="btn g" onClick={handleUse}>
            같은 쿠폰 다시 써보기 (시연용)
          </button>
        ) : (
          <button className="btn d" disabled>
            사용할 수 없는 쿠폰
          </button>
        )
      }
    >
      {expired && (
        <div className="nb err">
          <div>
            <b>지금 쓸 수 없는 쿠폰이에요</b>
            <br />
            유효기간이 지났어요 ({mmdd(coupon.expiresAt)} 만료)
          </div>
        </div>
      )}
      <CouponCard coupon={coupon} large={!expired} />
      {!expired && (
        <div className="who">
          <span className="avatar s">{coupon.merchantShort}</span>
          <div>
            <b>
              {name} · {coupon.merchantCategory}
            </b>
            <br />
            <span className="cap">{coupon.title}</span>
          </div>
        </div>
      )}
      <dl className="kv">
        <dt>할인</dt>
        <dd>{won(coupon.value)}</dd>
        <dt>최소 주문</dt>
        <dd>{won(coupon.minOrder)} 이상</dd>
        <dt>유효기간</dt>
        <dd>{expired ? `${mmdd(coupon.expiresAt)} 만료` : `${mmdd(coupon.expiresAt)}까지${usable ? ` (D-${dDay(coupon.expiresAt)})` : ''}`}</dd>
        <dt>사용처</dt>
        <dd>{name}</dd>
        {!expired && (
          <>
            <dt>사용 횟수</dt>
            <dd>1회</dd>
            <dt>받은 경로</dt>
            <dd>
              {coupon.fromMerchantName} 구매 · {mmdd(coupon.issuedAt)}
            </dd>
          </>
        )}
      </dl>
      {!expired && (
        <>
          <details className="nb">
            <summary>
              유의사항 보기 <span>⌄</span>
            </summary>
            <ul>
              {/* 인수인계 문서 [확정]: 현금화·분할 사용 불가 */}
              <li>쿠폰은 현금으로 바꾸거나 나눠 쓸 수 없어요.</li>
              <li>
                {name}에서 {won(coupon.minOrder)} 이상 주문할 때 쓸 수 있어요.
              </li>
            </ul>
          </details>
          {/* 지갑 주소 대신 '기록 확인' 링크만 */}
          <Link className="nb row" to={`/coupons/${couponId}/history`}>
            발급·사용 기록 확인<span>›</span>
          </Link>
        </>
      )}
    </PhoneScreen>
  )
}

// 주소의 쿠폰(:couponId)이 바뀌면 화면을 새로 만든다 (이전 쿠폰의 결과가 남지 않게)
function CouponDetailPage() {
  const { couponId } = useParams()
  return <CouponScreen key={couponId} couponId={couponId} />
}

export default CouponDetailPage
