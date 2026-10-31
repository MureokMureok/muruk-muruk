import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, previewPurchase, purchase } from '../api/api.js'
import { getUser } from '../auth/mockAuth.js'
import ChainProgress from '../components/ChainProgress.jsx'
import { runWithSteps } from '../utils/runWithSteps.js'
import MerchantMark from '../components/MerchantMark.jsx'
import PhoneScreen from '../components/PhoneScreen.jsx'
import Ticket from '../components/Ticket.jsx'
import { useApi } from '../hooks/useApi.js'
import { won } from '../utils/format.js'

const STEPS = ['모의 결제 승인', '구매 확인 (가게 서명)', '기획전 규칙 확인', '쿠폰 발급', '블록 확정']

// 참여 가게에서 구매 → 다른 가게 쿠폰 발급 (목업 c-campaign.html의 buy·issue 화면)
function BuyPage() {
  const { merchantId } = useParams() // 주소의 :merchantId 부분
  const user = getUser()
  const { data } = useApi(async () => {
    const [product, preview] = await Promise.all([getProduct(merchantId), previewPurchase(user.id, merchantId)])
    return { product, preview }
  }, [merchantId, user.id])

  const [phase, setPhase] = useState('ready') // ready → paying → done
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)

  async function handlePay() {
    setPhase('paying')
    const r = await runWithSteps(() => purchase(user.id, merchantId), STEPS.length, setStep)
    setResult(r)
    setPhase('done')
  }

  if (!data) return <PhoneScreen title="구매하기" />
  const { product, preview } = data

  // ----- 결제 처리 중 -----
  if (phase === 'paying') {
    return (
      <PhoneScreen title="쿠폰 발급" back={false}>
        <div className="center-block">
          <span className="chip c-ok">결제 완료 · 시연용 카드</span>
          <h2>쿠폰을 발급하고 있어요</h2>
        </div>
        <ChainProgress steps={STEPS} step={step} />
      </PhoneScreen>
    )
  }

  // ----- 발급 결과 -----
  if (phase === 'done') {
    const n = result.issuedCoupons.length
    return (
      <PhoneScreen
        title="쿠폰 발급"
        back={false}
        foot={
          <Link className="pill lg p-forest full" to="/coupons">
            쿠폰함 보기
          </Link>
        }
      >
        <div className="res ok center-block">
          <div className="big-ic">✓</div>
          <h2>{n > 0 ? `쿠폰 ${n}장을 받았어요` : '구매가 완료됐어요'}</h2>
          <p className="tiny">
            {product.merchantName} · {product.name} · {won(result.order.paid)} 결제
          </p>
        </div>
        <div className="stack">
          {result.issuedCoupons.map((c) => (
            <Ticket key={c.id} coupon={c} caption={c.source === 'CAMPAIGN' ? '연합 기획전' : `조건 충족 보너스 · ${c.title}`} />
          ))}
        </div>
        {result.skipped.length > 0 && <p className="notice">충전금이 부족해 {result.skipped.join(', ')} 쿠폰은 발급되지 않았어요.</p>}
        <p className="tiny">구매한 {product.merchantName}의 기획전 쿠폰은 받지 않아요 · 발급할 때 각 가게 충전금에서 최대 할인액을 미리 확보해요</p>
      </PhoneScreen>
    )
  }

  // ----- 상품·받을 쿠폰 미리보기 -----
  return (
    <PhoneScreen
      title={`${product.merchantName}에서 구매하기`}
      foot={
        <>
          <span className="tiny center">시연용 카드 · 실제 결제 없음</span>
          <button className="pill lg p-forest full" onClick={handlePay}>
            {won(product.price)} 결제하기
          </button>
        </>
      }
    >
      <div className="card product">
        <MerchantMark m={product} size="lg" />
        <div>
          <span className="cap">{product.merchantName} · 예시 상품</span>
          <h2>{product.name}</h2>
          <b className="price">{won(product.price)}</b>
        </div>
      </div>

      <section>
        <div className="sec-h">
          <h2>이 상품을 사면 받는 쿠폰</h2>
          <span className="tiny">{preview.coupons.length}장</span>
        </div>
        {preview.campaignStatus !== 'ACTIVE' && <p className="notice">기획전이 아직 진행 중이 아니라 기획전 쿠폰은 발급되지 않아요.</p>}
        <div className="stack">
          {preview.coupons.map((c, i) => (
            <Ticket key={i} coupon={c} caption={c.source === 'CAMPAIGN' ? '연합 기획전' : `조건 충족 보너스 · ${c.title}`} />
          ))}
        </div>
      </section>
    </PhoneScreen>
  )
}

export default BuyPage
