import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { confirmOrder, getProduct, previewPurchase, purchase } from '../../api/api.js'
import { ROLES, getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import MissingScreen from '../../components/MissingScreen.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { SproutLoading, SproutOverlay } from '../../components/SproutLoading.jsx'
import StatusView from '../../components/StatusView.jsx'
import Timeline from '../../components/Timeline.jsx'
import { useApi } from '../../hooks/useApi.js'
import { mmdd, won } from '../../utils/format.js'

// 받을 쿠폰 조건 한 줄: "15,000원 이상 · 받은 날부터 30일"
const subOf = (c) => `${won(c.minOrder)} 이상 · ${c.validity === 'END' ? `${mmdd(c.expiresAt)}까지` : '받은 날부터 30일'}`

// 기획전이 진행 중이 아닐 때 안내
const NOT_ACTIVE = {
  PREPARING: '기획전이 아직 시작 전이라 기획전 쿠폰은 받을 수 없어요.',
  PAUSED: '기획전이 잠시 멈춰서 기획전 쿠폰은 받을 수 없어요.',
  ENDED: '기획전이 끝나서 기획전 쿠폰은 받을 수 없어요.',
}

// 쿠폰 발급 확인 중 (목업 상태 화면): 결과가 불확실하면 단정하지 않고 "확인하고 있어요", 다시 결제하라고 하지 않기
function IssuePending({ merchantName, count, buttons }) {
  return (
    <PhoneScreen
      title="결제 완료"
      back={false}
      foot={
        buttons && (
          <>
            <Link className="btn" to="/coupons">
              쿠폰함에서 확인하기
            </Link>
            <Link className="btn g" to="/home">
              홈으로
            </Link>
          </>
        )
      }
    >
      <StatusView
        kind="wait"
        title="쿠폰 발급을 확인하고 있어요"
        desc={
          <>
            결제는 완료됐어요.
            <br />
            쿠폰 발급 결과를 확인하는 중이에요.
            <br />
            잠시 후 쿠폰함에서 확인해 주세요.
            <br />
            다시 결제하지 않아도 돼요.
          </>
        }
      >
        <Timeline
          items={[
            { key: 1, tone: 'ok', title: `${merchantName} 결제 완료` },
            { key: 2, tone: 'w', title: `쿠폰 ${count}장 발급 확인 중` },
            { key: 3, tone: 'n', title: '쿠폰함에 넣기' },
          ]}
        />
      </StatusView>
    </PhoneScreen>
  )
}

// C-03 A가게 상품·구매 → C-04 쿠폰 발급 완료 / 발급 확인 중 / 발급 실패 (목업 v3)
// - 로그인 없이 볼 수 있고, "결제하기"를 누를 때 로그인 → 이 화면으로 복귀 (자동 구매 X)
function BuyScreen({ merchantId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const { data } = useApi(async () => {
    const [product, preview] = await Promise.all([getProduct(merchantId), previewPurchase(merchantId)])
    return { product, preview }
  }, [merchantId])

  const [phase, setPhase] = useState('ready') // ready → paying → done
  const [result, setResult] = useState(null)
  const paying = useRef(false) // 결제 진행 중 표시 (화면을 다시 그리지 않고 바로 바뀌는 값)
  const [payError, setPayError] = useState('')
  const [confirmState, setConfirmState] = useState('none') // 구매 확정: none(전) → working(처리 중) → done(완료)
  const [confirmError, setConfirmError] = useState('')

  async function handlePay() {
    // 비로그인: 로그인 후 이 화면으로 돌아오게 (구매는 다시 눌러야 함)
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    // 연속 클릭으로 주문이 두 번 생기지 않게 (state는 다음 화면 그릴 때 바뀌므로 ref로 즉시 막음)
    if (paying.current) return
    paying.current = true
    setPayError('')
    setPhase('paying')
    try {
      setResult(await purchase(user.id, merchantId))
      setPhase('done')
    } catch {
      setPayError('결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setPhase('ready')
    } finally {
      paying.current = false
    }
  }

  // 구매 확정 → 잠겨 있던 쿠폰이 사용 가능으로
  async function handleConfirm() {
    if (confirmState !== 'none') return
    setConfirmState('working')
    setConfirmError('')
    try {
      const r = await confirmOrder(user.id, result.order.id)
      setResult({ ...result, issuedCoupons: r.coupons })
      setConfirmState('done')
    } catch (err) {
      setConfirmError(err.message)
      setConfirmState('none')
    }
  }

  if (!data) return <PhoneScreen title="상품" />
  const { product, preview } = data
  if (!product) return <MissingScreen title="상품" message="찾을 수 없는 가게예요" to="/home" toLabel="홈으로" />
  const name = product.merchantName

  // ----- 결제 처리하는 동안: 새싹이가 자란다 -----
  if (phase === 'paying') {
    return (
      <PhoneScreen title="결제" back={false}>
        <SproutLoading growing title="결제하고 있어요" sub={`쿠폰 ${preview.coupons.length}장을 준비하고 있어요`} />
      </PhoneScreen>
    )
  }
  // ----- 쿠폰 발급 확인 중 (시연용 "확인 중에서 멈춤") -----
  if (phase === 'done' && result.pending) return <IssuePending merchantName={name} count={result.issuedCoupons.length + result.missedCoupons.length} buttons />

  // ----- 발급 실패 (일부 또는 전부): 결제는 됐지만 못 받은 쿠폰이 있음 -----
  if (phase === 'done' && result.missedCoupons.length > 0) {
    const got = result.issuedCoupons
    return (
      <PhoneScreen
        title="결제 완료"
        back={false}
        foot={
          <>
            <Link className="btn" to="/coupons">
              쿠폰함 보기
            </Link>
            <button className="btn g" disabled title="준비 중이에요">
              고객센터 문의
            </button>
          </>
        }
      >
        <StatusView kind="warn" sound="fail" title={got.length > 0 ? `쿠폰 ${result.missedCoupons.length}장을 발급하지 못했어요` : '쿠폰을 발급하지 못했어요'} desc={`${name} 결제는 정상 완료됐어요.`}>
          {result.missedCoupons.map((m, i) => (
            <div className="nb err col" key={i}>
              <span>
                받지 못한 쿠폰 <b>{m.merchantName} {won(m.value)}</b>
              </span>
              <span>사유: {m.reason}</span>
            </div>
          ))}
          {got.length > 0 && (
            <div className="nb ok">
              <span>
                받은 쿠폰{' '}
                <b>
                  {got.map((c) => `${c.merchantName} ${won(c.value)}`).join(', ')} ({got.length}장)
                </b>
                <br />
                쿠폰함에서 구매를 확정하면 쓸 수 있어요
              </span>
            </div>
          )}
        </StatusView>
      </PhoneScreen>
    )
  }

  // ----- C-04 쿠폰 발급 완료 -----
  if (phase === 'done') {
    const got = result.issuedCoupons
    const max = got.reduce((s, c) => s + c.value, 0)
    const needConfirm = got.length > 0 && confirmState !== 'done' // 아직 구매 확정 전
    return (
      <PhoneScreen
        title="결제 완료"
        back={false}
        foot={
          <>
            {needConfirm && (
              <button className="btn" disabled={confirmState === 'working'} onClick={handleConfirm}>
                구매 확정하기
              </button>
            )}
            <Link className={needConfirm ? 'btn g' : 'btn'} to="/coupons">
              쿠폰함 보기
            </Link>
            <Link className="btn g" to="/home">
              계속 둘러보기
            </Link>
          </>
        }
      >
        <StatusView
          kind="ok"
          top
          strong
          sound={got.length > 0 ? 'issue' : 'pay'}
          title={`${name} 결제가 완료됐어요`}
          desc={got.length > 0 ? `쿠폰 ${got.length}장을 받았어요` : '이번 구매로 받은 쿠폰은 없어요'}
        />
        {got.length > 0 && (
          <div className="grp">
            {got.map((c) => (
              <CouponCard key={c.id} coupon={c} />
            ))}
            <p className="cap center">구매한 {name} 쿠폰은 받지 않아요</p>
          </div>
        )}
        {needConfirm && <div className="nb warn">구매를 확정하면 쿠폰을 쓸 수 있어요</div>}
        {confirmState === 'done' && <div className="nb ok">구매를 확정했어요. 이제 쿠폰을 쓸 수 있어요</div>}
        {confirmError && <p className="nb err">{confirmError}</p>}
        {confirmState === 'working' && <SproutOverlay growing title="구매를 확정하고 있어요" />}
        {got.length > 1 && (
          <div className="nb ok">
            {got.length === 2 ? '두 쿠폰을' : `쿠폰 ${got.length}장을`} 모두 사용하면 최대 {won(max)} 할인받아요
          </div>
        )}
      </PhoneScreen>
    )
  }

  // ----- C-03 상품 · 받을 쿠폰 미리보기 -----
  const n = preview.coupons.length
  const canBuy = !user || user.role === ROLES.CONSUMER // 가맹점·KCP 계정은 손님 쿠폰함이 없어 구매하지 않는다
  return (
    <PhoneScreen
      title={name}
      foot={
        <>
          <span className="demo">{!user ? '결제하려면 로그인이 필요해요 · 로그인 후 이 화면으로 돌아와요' : canBuy ? '시연용 가상 결제예요. 실제 결제는 일어나지 않아요' : '소비자 계정으로 로그인해야 결제할 수 있어요'}</span>
          <button className="btn" disabled={!canBuy} onClick={handlePay}>
            {won(product.price)} 결제하기
          </button>
        </>
      }
    >
      {payError && <p className="nb err">{payError}</p>}
      <div className="shopimg" style={{ height: 150 }}>
        상품 이미지
      </div>
      <div>
        <span className="cap">
          {name} · {product.merchantCategory}
        </span>
        <h2 style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{product.name}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <b className="ink" style={{ fontSize: 19, fontWeight: 900 }}>
            {won(product.price)}
          </b>
          {preview.campaignStatus === 'ACTIVE' && <span className="chip">연합 기획전 참여</span>}
        </div>
      </div>

      <section className="grp">
        <h3 className="h4">구매하면 받는 쿠폰 {n}장</h3>
        {NOT_ACTIVE[preview.campaignStatus] && <p className="nb warn">{NOT_ACTIVE[preview.campaignStatus]}</p>}
        {preview.missed.length > 0 && <p className="nb warn">{preview.missed.map((m) => m.merchantName).join(', ')} 쿠폰은 모두 소진됐어요. 쿠폰 없이 구매할 수 있어요.</p>}
        {preview.coupons.map((c, i) => (
          <CouponCard key={i} coupon={c} sub={subOf(c)} />
        ))}
        <p className="cap">구매한 {name} 쿠폰은 받지 않아요 · 받은 쿠폰은 구매 확정 후 쓸 수 있어요</p>
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
