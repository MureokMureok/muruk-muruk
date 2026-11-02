import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getProduct, previewPurchase, purchase } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import MerchantMark from '../../components/MerchantMark.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import StatusView from '../../components/StatusView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

// 받는 쿠폰 카드의 맨 위 글씨
const captionOf = (c) => (c.source === 'CAMPAIGN' ? `연합 기획전 · ${c.merchantName}` : `조건 충족 보너스 · ${c.title}`)

// ③ A 가게 상품·구매 → ④ 구매 완료 + 받은 쿠폰 (소비자 와이어프레임 v0)
// - 로그인 없이 볼 수 있고, "결제하기"를 누를 때 로그인 → 이 화면으로 복귀 (자동 구매 X, 가정 G4)
// - 처리 중에는 블록체인 단계 대신 "확인 중"만 보여준다
function BuyScreen({ merchantId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const { data } = useApi(async () => {
    const [product, preview] = await Promise.all([getProduct(merchantId), previewPurchase(user?.id, merchantId)])
    return { product, preview }
  }, [merchantId, user?.id])

  const [phase, setPhase] = useState('ready') // ready → paying → done
  const [result, setResult] = useState(null)
  const paying = useRef(false) // 결제 진행 중 표시 (화면을 다시 그리지 않고 바로 바뀌는 값)

  async function handlePay() {
    // 비로그인: 로그인 후 이 화면으로 돌아오게 (구매는 다시 눌러야 함)
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    // 연속 클릭으로 주문이 두 번 생기지 않게 (state는 다음 화면 그릴 때 바뀌므로 ref로 즉시 막음)
    if (paying.current) return
    paying.current = true
    setPhase('paying')
    const r = await purchase(user.id, merchantId)
    setResult(r)
    setPhase('done')
  }

  if (!data) return <PhoneScreen title="상품" />
  const { product, preview } = data

  // ----- 결제·쿠폰 발급 확인 중 -----
  if (phase === 'paying') {
    return (
      <PhoneScreen title="결제 완료" back={false}>
        <StatusView kind="wait" title="쿠폰 발급을 확인하고 있어요" desc="결제는 완료됐어요. 쿠폰을 받는 중이에요." />
      </PhoneScreen>
    )
  }

  // ----- ④-c 발급 실패: 결제는 됐지만 쿠폰을 못 받음 -----
  if (phase === 'done' && result.failed) {
    return (
      <PhoneScreen
        title="결제 완료"
        back={false}
        foot={
          <>
            <Link className="pill lg p-forest full" to="/coupons">
              쿠폰함 보기
            </Link>
            <button className="pill lg p-ghost full" disabled title="준비 중이에요">
              고객센터 문의
            </button>
          </>
        }
      >
        <StatusView kind="warn" sound="fail" title="쿠폰을 발급하지 못했어요" desc={`${product.merchantName} 결제는 정상적으로 완료됐어요`} />
        <div className="card rows">
          <div className="row">
            <span>받지 못한 쿠폰</span>
            <b>{result.missedCoupons.map((c) => c.merchantName).join(', ') || '없음'}</b>
          </div>
          <div className="row">
            <span>사유</span>
            <b>쿠폰 발급 처리 오류 (시연용)</b>
          </div>
          <div className="row">
            <span>결제</span>
            <b>{won(result.order.paid)} 완료</b>
          </div>
        </div>
        <p className="notice gray">발급이 다시 확인되면 쿠폰함에 들어와요. 계속 안 들어오면 고객센터로 문의해 주세요.</p>
      </PhoneScreen>
    )
  }

  // ----- ④ 구매 완료 + 받은 쿠폰 -----
  if (phase === 'done') {
    const n = result.issuedCoupons.length
    return (
      <PhoneScreen
        title="결제 완료"
        back={false}
        foot={
          <>
            <Link className="pill lg p-forest full" to="/coupons">
              쿠폰함 보기
            </Link>
            <Link className="pill lg p-ghost full" to="/home">
              계속 둘러보기
            </Link>
          </>
        }
      >
        <StatusView kind="ok" sound={n > 0 ? 'issue' : 'pay'} title={n > 0 ? `쿠폰 ${n}장을 받았어요` : '결제가 완료됐어요'} desc={`${product.merchantName} 결제가 완료됐어요`} />
        <div className="stack">
          {result.issuedCoupons.map((c) => (
            <CouponCard key={c.id} coupon={c} caption={captionOf(c)} />
          ))}
        </div>
        {result.skipped.length > 0 && <p className="notice">쿠폰이 모두 소진돼 {result.skipped.join(', ')} 쿠폰은 받지 못했어요.</p>}
        <p className="tiny center">구매한 {product.merchantName} 기획전 쿠폰은 받지 않아요</p>
      </PhoneScreen>
    )
  }

  // ----- ③ 상품 · 받을 쿠폰 미리보기 -----
  const n = preview.coupons.length
  return (
    <PhoneScreen
      title={product.merchantName}
      foot={
        <>
          <span className="tiny center">{user ? '시연용 가상 결제 · 실제 결제 없음' : '결제하려면 로그인이 필요해요 · 로그인 후 이 화면으로 돌아와요'}</span>
          <button className="pill lg p-forest full" onClick={handlePay}>
            {won(product.price)} 결제하기
          </button>
        </>
      }
    >
      <div className="product-visual" style={{ background: product.merchantColor }} aria-hidden="true">
        <MerchantMark m={product} size="lg" />
      </div>
      <div>
        <span className="tiny">
          {product.merchantName} · {product.merchantCategory}
        </span>
        <h2 className="title-lg">{product.name}</h2>
        <div className="row-top">
          <b className="price">{won(product.price)}</b>
          {preview.campaignStatus === 'ACTIVE' && <span className="chip sm c-lime">연합 기획전 참여</span>}
        </div>
      </div>

      <section>
        <div className="sec-h">
          <h2>구매하면 받는 쿠폰 {n}장</h2>
        </div>
        {preview.campaignStatus !== 'ACTIVE' && <p className="notice">기획전이 아직 진행 중이 아니라 기획전 쿠폰은 받을 수 없어요.</p>}
        {preview.skipped.length > 0 && <p className="notice">{preview.skipped.join(', ')} 쿠폰은 모두 소진됐어요. 쿠폰 없이 구매할 수 있어요.</p>}
        <div className="stack">
          {preview.coupons.map((c, i) => (
            <CouponCard
              key={i}
              coupon={c}
              caption={captionOf(c)}
              sub={c.source === 'CAMPAIGN' ? `${c.discountType === 'RATE' ? `최대 ${won(c.maxDiscount)} · ` : ''}${won(c.minOrder)} 이상 · 받은 날부터 30일` : undefined}
            />
          ))}
        </div>
      </section>
    </PhoneScreen>
  )
}

// 주소의 가게(:merchantId)가 바뀌면 화면을 새로 만든다 (key가 바뀌면 React가 처음부터 다시 그림)
// → 다른 가게 상품으로 바로 넘어가도 이전 가게의 결제 결과가 남지 않게
function BuyPage() {
  const { merchantId } = useParams()
  return <BuyScreen key={merchantId} merchantId={merchantId} />
}

export default BuyPage
