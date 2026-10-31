import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { USE_CHECKS, benefitText, calcDiscount, getCoupon, getProduct, redeemCoupon } from '../api/api.js'
import { getUser } from '../auth/mockAuth.js'
import ChainProgress from '../components/ChainProgress.jsx'
import { runWithSteps } from '../utils/runWithSteps.js'
import MerchantMark from '../components/MerchantMark.jsx'
import PhoneScreen from '../components/PhoneScreen.jsx'
import Ticket from '../components/Ticket.jsx'
import { useApi } from '../hooks/useApi.js'
import { blockNo, won } from '../utils/format.js'

const STEPS = ['지갑 서명', '거래 전송', '컨트랙트 검증', '블록 확정']
const VERIFY_STEP = 2 // '컨트랙트 검증' 단계 번호 (거절되면 여기서 멈춤)

// 컨트랙트가 확인하는 항목들을 동그란 칩으로 표시. results가 없으면 회색(아직 확인 전)
function Checks({ results, failedKey }) {
  return (
    <div>
      <div className="checks-label">사용할 때 컨트랙트가 확인해요</div>
      <div className="checks">
        {USE_CHECKS.map((ch) => {
          let cls = ''
          if (failedKey === ch.key) cls = 'fail'
          else if (results && results[ch.key]) cls = 'ok'
          return (
            <span key={ch.key} className={cls}>
              {ch.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// 쿠폰 상세 → 주문 결제에 사용 → 결과(사용 완료 / 거절) (목업 c-wallet.html의 detail·use·done·rejected 화면)
function CouponDetailPage() {
  const { couponId } = useParams()
  const user = getUser()
  const { data, reload } = useApi(async () => {
    const coupon = await getCoupon(couponId)
    const product = coupon ? await getProduct(coupon.merchantId) : null
    return { coupon, product }
  }, [couponId])

  // phase: detail(상세) → order(주문 확인) → processing(처리 중) → done(완료) / rejected(거절)
  const [phase, setPhase] = useState('detail')
  const [step, setStep] = useState(0)
  const [failAt, setFailAt] = useState(-1)
  const [outcome, setOutcome] = useState(null)

  async function handleUse() {
    setPhase('processing')
    setFailAt(-1)
    try {
      const r = await runWithSteps(() => redeemCoupon(user.id, couponId, data.coupon.merchantId), STEPS.length, setStep, VERIFY_STEP)
      setOutcome(r)
      setPhase('done')
    } catch (err) {
      // 컨트랙트가 거절: 검증 단계에서 멈춤
      setFailAt(VERIFY_STEP)
      setOutcome(err)
      await new Promise((r) => setTimeout(r, 700))
      setPhase('rejected')
    }
    reload()
  }

  if (!data) return <PhoneScreen title="쿠폰 상세" />
  const { coupon, product } = data
  if (!coupon) return <PhoneScreen title="쿠폰 상세">쿠폰을 찾을 수 없어요.</PhoneScreen>

  const used = coupon.status === 'USED'

  // ----- 처리 중 -----
  if (phase === 'processing') {
    return (
      <PhoneScreen title="쿠폰 사용 처리 중" back={false}>
        <ChainProgress steps={STEPS} step={step} failAt={failAt} />
        <Checks results={failAt === -1 && step > VERIFY_STEP ? { exists: 1, owner: 1, merchant: 1, expiry: 1, unused: 1 } : null} />
        <p className="tiny">블록이 확정되기 전에는 '사용 완료'로 표시하지 않아요</p>
      </PhoneScreen>
    )
  }

  // ----- 사용 완료 -----
  if (phase === 'done') {
    const { order } = outcome
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <>
            {/* 시연 7장면: 같은 쿠폰을 다시 써 보면 컨트랙트가 거절 */}
            <button className="pill lg p-ghost full" onClick={handleUse}>
              같은 쿠폰 다시 써 보기
            </button>
            <Link className="pill lg p-forest full" to="/coupons">
              쿠폰함으로
            </Link>
          </>
        }
      >
        <div className="res ok center-block">
          <div className="big-ic">✓</div>
          <h2>사용 완료</h2>
          <p className="tiny">블록 확정 뒤에 표시된 결과예요.</p>
        </div>
        <Ticket coupon={outcome.coupon} />
        <div className="card rows">
          <div className="row">
            <span>상품</span>
            <b>{order.productName}</b>
          </div>
          <div className="row">
            <span>할인</span>
            <b>−{won(order.discount)}</b>
          </div>
          <div className="row">
            <span>결제</span>
            <b>{won(order.paid)}</b>
          </div>
          <div className="row">
            <span>할인 부담</span>
            <b>{coupon.merchantName} (충전금에서 정산)</b>
          </div>
          <div className="row">
            <span>체인 기록</span>
            <b>블록 {blockNo(outcome.coupon.usedBlock)} (모의)</b>
          </div>
        </div>
        <Checks results={outcome.checks} />
      </PhoneScreen>
    )
  }

  // ----- 거절 -----
  if (phase === 'rejected') {
    const failed = USE_CHECKS.find((c) => c.key === outcome.failedKey)
    return (
      <PhoneScreen
        title="사용 결과"
        back={false}
        foot={
          <Link className="pill lg p-forest full" to="/coupons">
            쿠폰함으로
          </Link>
        }
      >
        <div className="res bad center-block">
          <div className="big-ic">!</div>
          <h2>쓸 수 없는 쿠폰이에요</h2>
          <p>{outcome.message}</p>
        </div>
        <p className="notice gray">쿠폰 상태는 바뀌지 않아요 · 거절 기록만 남아요</p>
        <div className="card">
          <span className="chip sm c-bad">컨트랙트 검증 거절</span>
          <p style={{ marginTop: 10 }}>{failed ? `'${failed.label}' 조건을 통과하지 못했어요.` : outcome.message}</p>
        </div>
        <Checks results={outcome.checks} failedKey={outcome.failedKey} />
      </PhoneScreen>
    )
  }

  // ----- 주문 결제 (쿠폰 적용) -----
  if (phase === 'order') {
    const discount = calcDiscount(coupon, product.price)
    const enough = product.price >= coupon.minOrder
    return (
      <PhoneScreen
        title="주문 결제"
        foot={
          <>
            <span className="tiny center">누르면 지갑 서명과 전송이 자동으로 이어져요</span>
            <button className="pill lg p-forest full" disabled={!enough} onClick={handleUse}>
              쿠폰 쓰고 {won(product.price - discount)} 결제
            </button>
          </>
        }
      >
        <div className="card product">
          <MerchantMark m={product} size="lg" />
          <div>
            <span className="cap">{product.merchantName} · 예시 주문</span>
            <h2>{product.name}</h2>
            <b className="price">{won(product.price)}</b>
          </div>
        </div>
        <div className="checkout-total">
          <div className="discount">
            쿠폰 적용 · {coupon.merchantName} {benefitText(coupon)} −{won(discount)}
          </div>
          <span className="cap">결제 금액</span>
          <div className="amount">{won(product.price - discount)}</div>
        </div>
        {!enough && <p className="notice bad">최소 주문 금액 {won(coupon.minOrder)} 이상이어야 쓸 수 있어요.</p>}
      </PhoneScreen>
    )
  }

  // ----- 상세 -----
  return (
    <PhoneScreen
      title="쿠폰 상세"
      foot={
        used ? (
          <button className="pill lg p-ghost full" onClick={handleUse}>
            이미 쓴 쿠폰 다시 써 보기
          </button>
        ) : (
          <button className="pill lg p-forest full" onClick={() => setPhase('order')}>
            {coupon.merchantName}에서 사용하기
          </button>
        )
      }
    >
      <div className="hero-ticket">
        <Ticket coupon={coupon} />
      </div>
      <div className="card rows">
        <div className="row">
          <span>할인</span>
          <b>{benefitText(coupon)}</b>
        </div>
        <div className="row">
          <span>최소 주문</span>
          <b>{won(coupon.minOrder)}</b>
        </div>
        <div className="row">
          <span>유효기간</span>
          <b>{coupon.expiresAt}까지</b>
        </div>
        <div className="row">
          <span>사용처</span>
          <b>{coupon.merchantName}</b>
        </div>
        <div className="row">
          <span>받은 경로</span>
          <b>{coupon.source === 'CAMPAIGN' ? coupon.title : `${coupon.merchantName} 조건부 쿠폰`}</b>
        </div>
        <div className="row">
          <span>상태</span>
          <b>{used ? '사용 완료 · 다시 쓸 수 없음' : '사용 가능'}</b>
        </div>
      </div>
      <Checks />
      <p className="tiny">
        발급 기록 · 블록 {blockNo(coupon.issuedBlock)} (모의) <span className="lane on">온체인</span>
      </p>
    </PhoneScreen>
  )
}

export default CouponDetailPage
