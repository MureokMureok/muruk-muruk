import { useParams } from 'react-router-dom'
import { getCoupon, getCouponHistory } from '../../api/api.js'
import CouponCard from '../../components/CouponCard.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'
import { num } from '../../utils/format.js'

// 기록 종류 → 소비자에게 보일 이름
const LABEL = { '쿠폰 발급': '발급', '쿠폰 사용': '사용', '사용 거절': '사용 시도 · 거절' }

// ⑫ 발급·사용 기록 (소비자 와이어프레임 v0)
// 블록체인의 "고칠 수 없는 장부"를 소비자 쪽에서 보여주는 유일한 화면. 지갑 주소는 보여주지 않는다
function CouponHistoryPage() {
  const { couponId } = useParams()
  const { data } = useApi(async () => {
    const [coupon, history] = await Promise.all([getCoupon(couponId), getCouponHistory(couponId)])
    return { coupon, history }
  }, [couponId])

  if (!data) return <PhoneScreen title="발급·사용 기록" />
  const { coupon, history } = data

  return (
    <PhoneScreen
      title="발급·사용 기록"
      foot={
        <>
          {/* 11/26 KCP 네트워크 배포 후 외부 탐색기 연결 예정 */}
          <button className="pill lg p-ghost full" disabled>
            블록체인 탐색기에서 보기
          </button>
          <span className="tiny center">KCP 네트워크 연결 후 열려요</span>
        </>
      }
    >
      {coupon && <CouponCard coupon={coupon} />}
      <p className="notice gray">이 쿠폰의 발급·사용 기록은 참여 가게들이 함께 보는 장부에 남아요. 한 번 남은 기록은 고칠 수 없어요.</p>

      <section className="card">
        <h3 className="h-sm">기록</h3>
        <ol className="timeline">
          {history.map((h) => (
            <li key={h.block}>
              <div className="row-top">
                <b className="ink">{LABEL[h.label] ?? h.label}</b>
                <span className="tiny">{h.label === '사용 거절' ? '기록됨' : '확인됨'}</span>
              </div>
              <span className="tiny" style={{ display: 'block' }}>
                {h.at.slice(5).replace('-', '/')} · {h.detail}
              </span>
              <span className="tiny" style={{ display: 'block' }}>
                기록 번호 #{num(h.block)} (예시)
              </span>
            </li>
          ))}
        </ol>
      </section>
    </PhoneScreen>
  )
}

export default CouponHistoryPage
