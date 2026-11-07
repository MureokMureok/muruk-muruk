import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { USE_CHECKS, calcDiscount, cancelOrder, confirmOrder, getCoupon, getProduct, redeemCoupon } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import Icon from '../../components/Icon.jsx'
import MissingScreen from '../../components/MissingScreen.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { SproutLoading, SproutOverlay } from '../../components/SproutLoading.jsx'
import StatusView from '../../components/StatusView.jsx'
import Toast from '../../components/Toast.jsx'
import { useApi } from '../../hooks/useApi.js'
import { useToast } from '../../hooks/useToast.js'
import { dDay, mdhm, minOrderText, mmdd, won } from '../../utils/format.js'

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

// C-07 쿠폰 상세 → C-08 B가게 결제(가상) → 처리 중 → 구매 확정(사용 완료) 또는 환불(복원) (쿠폰 정책표 기준)
// 그 밖에 사용 확인 중 / 재사용 거절 / 사용 실패 / 사용 불가 (목업 v3)
function CouponScreen({ couponId }) {
  const user = getUser()
  const { data, reload } = useApi(async () => {
    const coupon = await getCoupon(couponId, user.id)
    const product = coupon ? await getProduct(coupon.merchantId) : null
    return { coupon, product }
  }, [couponId])

  // phase: detail(상세) → order(결제) → using(처리하는 동안) → applied(결제 적용·처리 중) → used(사용 완료) / refunded(환불·복원)
  //        checking: 시연용 "사용 확인 중에서 멈춤"
  //        실패하면 rejected(사용 못 함)
  const [phase, setPhase] = useState('detail')
  const [outcome, setOutcome] = useState(null)
  const [working, setWorking] = useState('') // 구매 확정·취소 처리 중이면 그 안내 문구 (버튼을 잠그고 새싹이를 보여준다)
  const [notice, showNotice] = useToast()
  const [orderError, setOrderError] = useState('')
  const busy = useRef(false) // 버튼 연속 클릭 → 같은 처리가 두 번 일어나는 것을 방지

  async function handleUse() {
    if (busy.current) return
    busy.current = true
    setPhase('using')
    try {
      const r = await redeemCoupon(user.id, couponId, data.coupon.merchantId)
      setOutcome(r)
      // 시연용 "사용 확인 중에서 멈춤"이면 확인 중 화면에 그대로 둔다 (처리는 끝났음 → 쿠폰함 사용 완료 탭에 "처리 중"으로 보임)
      setPhase(r.pending ? 'checking' : 'applied')
    } catch (err) {
      setOutcome(err)
      setPhase('rejected')
    }
    busy.current = false
    reload()
  }

  // 구매 확정 / 주문 취소 공통 처리. run: confirmOrder 또는 cancelOrder, orderId: 처리할 주문, then: 끝난 뒤 할 일
  async function handleOrder(run, orderId, then) {
    if (busy.current) return
    busy.current = true
    setWorking(run === confirmOrder ? '구매를 확정하고 있어요' : '주문을 취소하고 있어요')
    setOrderError('')
    try {
      then(await run(user.id, orderId))
    } catch (err) {
      setOrderError(err.message)
    }
    busy.current = false
    setWorking('')
    reload()
  }

  // B 가게 주문: 구매 확정 → 사용 완료 / 취소·환불 → 쿠폰 복원 (쿠폰의 useOrderId가 B 주문)
  const finishUse = (orderId) =>
    handleOrder(confirmOrder, orderId, (r) => {
      setOutcome(r)
      setPhase('used')
    })
  const refundUse = (orderId) =>
    handleOrder(cancelOrder, orderId, (r) => {
      setOutcome(r)
      setPhase('refunded')
    })

  if (!data) return <PhoneScreen title="쿠폰 상세" />
  const { coupon, product } = data
  if (!coupon) return <MissingScreen title="쿠폰 상세" message="찾을 수 없는 쿠폰이에요" to="/coupons" toLabel="쿠폰함으로" />
  const name = coupon.merchantName

  // ----- 쿠폰 사용 처리하는 동안: 새싹이가 자란다 -----
  if (phase === 'using') {
    return (
      <PhoneScreen title="사용 결과" back={false}>
        <SproutLoading growing title="쿠폰 사용 처리 중" sub="내 쿠폰인지 확인해요" />
      </PhoneScreen>
    )
  }

  // ----- 쿠폰 사용 확인 중 (시연용 "멈춤"): 같은 쿠폰으로 다시 결제하지 않도록 -----
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

  // ----- 결제에 쿠폰 적용 → 사용 처리 중: 구매 확정 또는 환불을 기다림 -----
  if (phase === 'applied') {
    const { order } = outcome
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            <span className="demo">시연용 가상 처리예요. 실제 환불은 일어나지 않아요</span>
            <button className="btn" disabled={working} onClick={() => finishUse(order.id)}>
              구매 확정하기
            </button>
            <button className="btn g" disabled={working} onClick={() => refundUse(order.id)}>
              주문 취소·환불하기
            </button>
            {/* 시연: 처리 중인 같은 쿠폰을 다시 써 보면 거절 */}
            <button className="text-link center" disabled={working} onClick={handleUse}>
              같은 쿠폰 다시 써보기 (시연용)
            </button>
          </>
        }
      >
        {/* 결과 화면마다 key가 달라야 체크 애니메이션이 다시 나온다 */}
        <StatusView key="applied" kind="ok" top sound="pay" title="결제에 쿠폰을 적용했어요" desc={`${name} 결제에 ${won(order.discount)} 할인이 적용됐어요`} />
        <CouponCard coupon={outcome.coupon} sub="구매를 확정하면 사용 완료돼요" />
        <Amounts amount={order.amount} discount={order.discount} />
        <div className="nb warn">구매를 확정하면 쿠폰을 다시 쓸 수 없어요. 확정 전에 주문을 취소하면 쿠폰이 돌아와요.</div>
        {orderError && <p className="nb err">{orderError}</p>}
        {working && <SproutOverlay growing title={working} />}
      </PhoneScreen>
    )
  }

  // ----- 주문 취소·환불: 쿠폰 복원 (유효기간이 지났으면 만료) -----
  if (phase === 'refunded') {
    const back = outcome.coupons[0]
    const late = back.status === 'EXPIRED'
    return (
      <PhoneScreen
        title="주문 취소"
        back={false}
        foot={
          <>
            <Link className="btn" to="/coupons">
              쿠폰함으로
            </Link>
            {!late && (
              <button className="btn g" onClick={() => setPhase('detail')}>
                쿠폰 상세 보기
              </button>
            )}
          </>
        }
      >
        <StatusView key="refunded" kind="ok" top title="주문을 취소했어요" desc={late ? '쿠폰 유효기간이 지나 만료됐어요' : '쿠폰이 돌아왔어요. 다시 쓸 수 있어요'} />
        <CouponCard coupon={back} />
      </PhoneScreen>
    )
  }

  // ----- C-09 쿠폰 사용 완료 (B 구매 확정) -----
  if (phase === 'used') {
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
        <StatusView key="used" kind="ok" top title="쿠폰 사용이 완료됐어요" desc={`${name} 구매를 확정했어요. ${won(order.discount)} 할인받았어요`} />
        <CouponCard coupon={outcome.coupons[0]} sub="다시 쓸 수 없어요" />
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
    const inProcess = outcome.couponStatus === 'PROCESSING' // 사용 처리 중인 쿠폰을 또 쓰려고 한 경우
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
          title={reused ? (inProcess ? '이미 결제에 적용된 쿠폰이에요' : '이미 사용한 쿠폰이에요') : '쓸 수 없는 쿠폰이에요'}
          desc={
            reused ? (
              <>
                {mdhm(outcome.usedAt)} {outcome.merchantName}
                {inProcess ? ' 결제에 적용된 쿠폰이라' : '에서 사용된 쿠폰이라'}
                <br />
                쓸 수 없어요. 결제는 진행되지 않았어요.
              </>
            ) : (
              `${outcome.message} 결제는 진행되지 않았어요.`
            )
          }
        >
          <CouponCard coupon={coupon} />
          {/* 시연용: 5가지 확인 중 어디서 막혔는지. 연결 오류 등에는 확인 결과가 없다 */}
          {outcome.checks && <CheckList results={outcome.checks} failedKey={outcome.failedKey} />}
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
        onBack={() => setPhase('detail')}
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
        <div className="nb warn">결제하면 쿠폰은 처리 중으로 바뀌고, 구매를 확정하면 사용 완료돼요</div>
      </PhoneScreen>
    )
  }

  // ----- C-07 쿠폰 상세 / 잠김·처리 중 / 사용 불가 쿠폰(만료·소멸) -----
  const usable = coupon.status === 'AVAILABLE'
  const locked = coupon.status === 'LOCKED'
  const processing = coupon.status === 'PROCESSING'
  const expired = coupon.status === 'EXPIRED'
  const voided = coupon.status === 'VOIDED'
  const ended = expired || voided // 다시는 쓸 수 없는 쿠폰
  return (
    <PhoneScreen
      title="쿠폰 상세"
      foot={
        usable ? (
          <button className="btn y" onClick={() => setPhase('order')}>
            {name}에서 사용하기
          </button>
        ) : locked ? (
          // 잠김: A 가게 구매 확정 → 사용 가능 / A 주문 취소 → 소멸 (같은 구매로 받은 쿠폰 전부)
          <>
            <span className="demo">시연용 가상 처리예요. 실제 환불은 일어나지 않아요</span>
            <button className="btn" disabled={working} onClick={() => handleOrder(confirmOrder, coupon.orderId, () => showNotice(`구매를 확정했어요. 이제 ${name}에서 쓸 수 있어요`))}>
              {coupon.fromMerchantName} 구매 확정하기
            </button>
            <button className="btn g" disabled={working} onClick={() => handleOrder(cancelOrder, coupon.orderId, () => {})}>
              {coupon.fromMerchantName} 주문 취소하기
            </button>
          </>
        ) : processing ? (
          // 사용 처리 중: B 가게 구매 확정 → 사용 완료 / 취소·환불 → 복원
          <>
            <span className="demo">시연용 가상 처리예요. 실제 환불은 일어나지 않아요</span>
            <button className="btn" disabled={working} onClick={() => finishUse(coupon.useOrderId)}>
              {name} 구매 확정하기
            </button>
            <button className="btn g" disabled={working} onClick={() => refundUse(coupon.useOrderId)}>
              주문 취소·환불하기
            </button>
            {/* 시연: 처리 중인 같은 쿠폰을 다시 써 보면 거절 */}
            <button className="text-link center" disabled={working} onClick={handleUse}>
              같은 쿠폰 다시 써보기 (시연용)
            </button>
          </>
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
      {working && <SproutOverlay growing title={working} />}
      <Toast text={notice} />
      {orderError && <p className="nb err">{orderError}</p>}
      {expired && (
        <div className="nb err">
          <div>
            <b>지금 쓸 수 없는 쿠폰이에요</b>
            <br />
            유효기간이 지났어요 ({mmdd(coupon.expiresAt)} 만료)
          </div>
        </div>
      )}
      {voided && (
        <div className="nb err">
          <div>
            <b>사라진 쿠폰이에요</b>
            <br />
            {coupon.fromMerchantName} 주문을 취소해서 쓸 수 없어요
          </div>
        </div>
      )}
      {locked && (
        <div className="nb warn">
          <div>
            <b>구매 확정 후 쓸 수 있어요</b>
            <br />
            {coupon.fromMerchantName} 주문을 취소하면 이 구매로 받은 쿠폰 {coupon.issuedTogether}장이 함께 사라져요
          </div>
        </div>
      )}
      {processing && (
        <div className="nb warn">
          <div>
            <b>결제에 적용돼 처리 중이에요</b>
            <br />
            구매를 확정하면 사용 완료되고, 주문을 취소하면 쿠폰이 돌아와요
          </div>
        </div>
      )}
      <CouponCard coupon={coupon} large={!ended} />
      {!ended && (
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
        <dd>{minOrderText(coupon.minOrder)}</dd>
        <dt>유효기간</dt>
        <dd>{voided ? '소멸' : expired ? `${mmdd(coupon.expiresAt)} 만료` : `${mmdd(coupon.expiresAt)}까지${usable ? ` (D-${dDay(coupon.expiresAt)})` : ''}`}</dd>
        <dt>사용처</dt>
        <dd>{name}</dd>
        <dt>쿠폰 ID</dt>
        <dd>#{coupon.tokenId}</dd>
        <dt>tx 해시</dt>
        <dd className="tx-full">{coupon.lastTx}</dd>
        {!ended && (
          <>
            <dt>사용 횟수</dt>
            <dd>1회</dd>
            <dt>받은 경로</dt>
            <dd>
              {coupon.policyId ? '직접 받기' : `${coupon.fromMerchantName} 구매`} · {mmdd(coupon.issuedAt)}
            </dd>
          </>
        )}
      </dl>
      {!ended && (
        <>
          <details className="nb">
            <summary>
              유의사항 보기 <span>⌄</span>
            </summary>
            <ul>
              {/* 인수인계 문서 [확정]: 현금화·분할 사용 불가 */}
              <li>쿠폰은 현금으로 바꾸거나 나눠 쓸 수 없어요.</li>
              <li>{coupon.minOrder > 0 ? `${name}에서 ${won(coupon.minOrder)} 이상 주문할 때 쓸 수 있어요.` : `${name}에서 쓸 수 있어요.`}</li>
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
