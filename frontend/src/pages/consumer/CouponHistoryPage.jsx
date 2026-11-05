import { useParams } from 'react-router-dom'
import { getCoupon, getCouponHistory } from '../../api/api.js'
import CouponCard from '../../components/CouponCard.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import Timeline from '../../components/Timeline.jsx'
import { useApi } from '../../hooks/useApi.js'
import { mdhm } from '../../utils/format.js'

// 기록 한 줄 → 타임라인 한 칸
function toItem(h) {
  if (h.type === 'ISSUE') return { key: h.id, tone: 'ok', title: '발급 확인됨', sub: `${mdhm(h.at)} · ${h.merchantName} 구매로 발급` }
  if (h.type === 'CONFIRM') return { key: h.id, tone: 'ok', title: '구매 확정 · 사용 가능', sub: `${mdhm(h.at)} · ${h.merchantName} 구매 확정` }
  if (h.type === 'APPLY') return { key: h.id, tone: 'w', title: '결제 적용 · 처리 중', sub: `${mdhm(h.at)} · ${h.merchantName} 결제에 적용` }
  if (h.type === 'USE') return { key: h.id, tone: 'ok', title: '사용 확인됨', sub: `${mdhm(h.at)} · ${h.merchantName} 구매 확정` }
  if (h.type === 'REFUND') return { key: h.id, tone: h.voided ? 'x' : 'n', title: h.detail.split(' · ')[1], sub: `${mdhm(h.at)} · ${h.merchantName} 주문 취소` }
  const reused = h.detail.includes('재사용')
  const reusedWhat = h.detail.includes('처리 중') ? '결제에 적용 중인 쿠폰' : '이미 사용한 쿠폰'
  return { key: h.id, tone: 'x', title: reused ? '재사용 시도 · 거절 기록됨' : '사용 시도 · 거절 기록됨', sub: `${mdhm(h.at)} · ${reused ? reusedWhat : h.detail.split(' · ')[1]}` }
}

// C-12 발급·사용 기록 (목업 v3)
// 블록체인의 "고칠 수 없는 장부"를 소비자 쪽에서 보여주는 화면. 지갑 주소·긴 번호는 보여주지 않는다
function CouponHistoryPage() {
  const { couponId } = useParams()
  const { data } = useApi(async () => {
    const [coupon, history] = await Promise.all([getCoupon(couponId), getCouponHistory(couponId)])
    return { coupon, history }
  }, [couponId])

  if (!data) return <PhoneScreen title="발급·사용 기록" />
  const { coupon, history } = data

  return (
    <PhoneScreen title="발급·사용 기록">
      {coupon && <CouponCard coupon={coupon} />}
      <div className="nb ok">이 쿠폰의 발급·사용 기록은 참여 가게가 함께 확인해요</div>
      <section className="grp">
        <h3 className="h4">기록</h3>
        <Timeline items={history.map(toItem)} />
      </section>
      {/* 11/26 KCP 네트워크 배포 후 외부 탐색기 연결 예정 */}
      <div className="nb row" style={{ color: 'var(--muted)' }}>
        외부 기록 확인<span className="chip b">준비 중</span>
      </div>
    </PhoneScreen>
  )
}

export default CouponHistoryPage
