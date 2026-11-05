import { useParams } from 'react-router-dom'
import { getCoupon, getCouponHistory } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import MissingScreen from '../../components/MissingScreen.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import Timeline from '../../components/Timeline.jsx'
import { useApi } from '../../hooks/useApi.js'
import { mdhm, shortTx } from '../../utils/format.js'

// 기록 한 줄 → 타임라인 한 칸
function toItem(h) {
  if (h.type === 'ISSUE') return { key: h.id, tone: 'ok', title: '발급 확인됨', sub: `${mdhm(h.at)} · ${h.merchantName} ${h.claimed ? '쿠폰 직접 받기' : '구매로 발급'}` }
  if (h.type === 'CONFIRM') return { key: h.id, tone: 'ok', title: '구매 확정 · 사용 가능', sub: `${mdhm(h.at)} · ${h.merchantName} 구매 확정` }
  if (h.type === 'APPLY') return { key: h.id, tone: 'w', title: '결제 적용 · 처리 중', sub: `${mdhm(h.at)} · ${h.merchantName} 결제에 적용` }
  if (h.type === 'USE') return { key: h.id, tone: 'ok', title: '사용 확인됨', sub: `${mdhm(h.at)} · ${h.merchantName} 구매 확정` }
  if (h.type === 'REFUND') return { key: h.id, tone: h.voided ? 'x' : 'n', title: h.detail.split(' · ')[1], sub: `${mdhm(h.at)} · ${h.merchantName} 주문 취소` }
  const reused = h.reason === 'COUPON_ALREADY_USED'
  const reusedWhat = h.couponStatus === 'PROCESSING' ? '결제에 적용 중인 쿠폰' : '이미 사용한 쿠폰'
  return { key: h.id, tone: 'x', title: reused ? '재사용 시도 · 거절 기록됨' : '사용 시도 · 거절 기록됨', sub: `${mdhm(h.at)} · ${reused ? reusedWhat : h.detail.split(' · ')[1]}` }
}

// C-12 발급·사용 기록 (목업 v3)
// 지갑 주소는 보여주지 않고, 쿠폰 ID와 tx 해시는 정책표 시트 5의 캡처를 위해 보여준다
function CouponHistoryPage() {
  const { couponId } = useParams()
  const userId = getUser().id
  const { data } = useApi(async () => {
    const [coupon, history] = await Promise.all([getCoupon(couponId, userId), getCouponHistory(couponId)])
    return { coupon, history }
  }, [couponId, userId])

  if (!data) return <PhoneScreen title="발급·사용 기록" />
  const { coupon, history } = data
  if (!coupon) return <MissingScreen title="발급·사용 기록" message="찾을 수 없는 쿠폰이에요" to="/coupons" toLabel="쿠폰함으로" />

  return (
    <PhoneScreen title="발급·사용 기록">
      <CouponCard coupon={coupon} />
      <p className="cap">쿠폰 ID #{coupon.tokenId}</p>
      <div className="nb ok">이 쿠폰의 발급·사용 기록은 참여 가게가 함께 확인해요</div>
      <section className="grp">
        <h3 className="h4">기록</h3>
        <Timeline items={history.map((h) => ({ ...toItem(h), sub: `${toItem(h).sub} · tx ${shortTx(h.tx)}` }))} />
      </section>
      {/* 11/26 KCP 네트워크 배포 후 외부 탐색기 연결 예정 */}
      <div className="nb row" style={{ color: 'var(--muted)' }}>
        외부 기록 확인<span className="chip b">준비 중</span>
      </div>
    </PhoneScreen>
  )
}

export default CouponHistoryPage
