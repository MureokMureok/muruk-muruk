import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { claimCoupon, getCouponOffers } from '../../api/api.js'
import { ROLES, getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { SproutOverlay } from '../../components/SproutLoading.jsx'
import StatusView from '../../components/StatusView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { minOrderText } from '../../utils/format.js'
import { playSound } from '../../utils/sound.js'

function ClaimAction({ offer, canClaim, busy, onClaim }) {
  if (offer.myCouponId) {
    return (
      <Link className="btn g sm" to={`/coupons/${offer.myCouponId}`}>
        받은 쿠폰 보기
      </Link>
    )
  }
  if (offer.qtyLeft === 0) {
    return (
      <button className="btn d sm" disabled>
        모두 소진됐어요
      </button>
    )
  }
  return (
    <button className="btn sm" disabled={busy || !canClaim} onClick={() => onClaim(offer)}>
      쿠폰 받기
    </button>
  )
}

// 가게가 발행한 일반 쿠폰을 손님이 직접 받는 화면. 둘러보기는 로그인 없이 되고, 받을 때 로그인한다
function CouponClaimPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const { data: offers, reload } = useApi(() => getCouponOffers(user?.id), [user?.id])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { ok, text }
  const claiming = useRef(false)
  const canClaim = !user || user.role === ROLES.CONSUMER

  async function handleClaim(offer) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    if (claiming.current) return
    claiming.current = true
    setBusy(true)
    setResult(null)
    try {
      await claimCoupon(user.id, offer.id)
      playSound('issue')
      setResult({ ok: true, text: `${offer.merchantName} 쿠폰을 받았어요. 바로 쓸 수 있어요` })
    } catch (err) {
      playSound('fail')
      setResult({ ok: false, text: err.message })
    } finally {
      await reload()
      claiming.current = false
      setBusy(false)
    }
  }

  if (!offers) return <PhoneScreen title="쿠폰 받기" />

  return (
    <PhoneScreen title="쿠폰 받기">
      {busy && <SproutOverlay growing title="쿠폰을 받고 있어요" />}
      {result && <p className={`nb ${result.ok ? 'ok' : 'err'}`}>{result.text}</p>}
      {!canClaim && <p className="nb warn">소비자 계정으로 로그인해야 쿠폰을 받을 수 있어요</p>}
      {offers.length === 0 ? (
        <StatusView kind="empty" title="지금 받을 수 있는 쿠폰이 없어요" />
      ) : (
        offers.map((offer) => (
          <section className="grp" key={offer.id}>
            <CouponCard
              coupon={{ ...offer, policyId: offer.id }}
              caption={offer.name}
              badge={offer.myCouponId ? { label: '받음', tone: 'g' } : { label: `${offer.qtyLeft}장 남음`, tone: 'y' }}
              sub={`${minOrderText(offer.minOrder)} · 받은 날부터 ${offer.validDays}일`}
            />
            <ClaimAction offer={offer} canClaim={canClaim} busy={busy} onClaim={handleClaim} />
          </section>
        ))
      )}
      <p className="cap">받은 쿠폰은 발행한 가게에서만 쓸 수 있어요 · 한 사람당 한 장만 받을 수 있어요</p>
    </PhoneScreen>
  )
}

export default CouponClaimPage
