import { Link } from 'react-router-dom'
import { getCampaign } from '../../api/api.js'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'
import { period, won } from '../../utils/format.js'

// 기획전이 진행 중이 아닐 때 안내
const NOT_ACTIVE = {
  PREPARING: '아직 시작 전이에요. 지금 구매하면 기획전 쿠폰은 발급되지 않아요.',
  PAUSED: '기획전이 잠시 멈췄어요. 지금 구매하면 기획전 쿠폰은 발급되지 않아요. 이미 받은 쿠폰은 그대로 쓸 수 있어요.',
  ENDED: '끝난 기획전이에요. 이미 받은 쿠폰은 유효기간까지 쓸 수 있어요.',
}

// C-02 연합 기획전 상세 (목업 v3)
// 핵심: "어디서 사면 → 어떤 쿠폰" 연결이 한눈에 보이게. 로그인 없이 볼 수 있음
function CampaignPage() {
  const { data: c } = useApi(() => getCampaign(), [])
  if (!c) return <PhoneScreen title="연합 기획전" />

  return (
    <PhoneScreen
      title="연합 기획전"
      foot={
        <Link className="btn" to={`/campaign/buy/${c.terms[0].merchantId}`}>
          {c.terms[0].merchantName} 상품 보기
        </Link>
      }
    >
      <div className="shopimg" style={{ height: 80 }}>
        기획전 이미지
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{c.title}</h2>
        <p className="cap" style={{ fontSize: 13, marginTop: 3 }}>
          {period(c)} · 참여 가게 {c.terms.length}곳
        </p>
      </div>

      {NOT_ACTIVE[c.status] && <p className="nb warn">{NOT_ACTIVE[c.status]}</p>}

      {/* 어떻게 받나요 — 3단계 */}
      <section className="grp">
        <h3 className="h4">어떻게 받나요</h3>
        <div className="steps3">
          <div>
            <i>1</i>참여 가게에서 구매<small>한 곳만 골라요</small>
          </div>
          <div>
            <i>2</i>다른 가게 쿠폰 발급<small>자동으로 받아요</small>
          </div>
          <div>
            <i>3</i>각 가게에서 사용<small>조건을 확인해요</small>
          </div>
        </div>
        <p className="cap">구매한 가게의 쿠폰은 받지 않아요</p>
      </section>

      {/* 어디서 사면 무엇을 받나요 */}
      <section className="grp" style={{ gap: 8 }}>
        <h3 className="h4">어디서 사면 무엇을 받나요</h3>
        {c.terms.map((t) => {
          const gets = c.terms.filter((x) => x.merchantId !== t.merchantId && x.registered)
          // 실제 발급 규칙과 같게: 소진된 가게 쿠폰만 빠지고 남은 가게 쿠폰은 계속 받는다
          const open = gets.filter((x) => x.qtyLeft > 0)
          const left = Math.min(...open.map((x) => x.qtyLeft))
          const total = Math.min(...open.map((x) => x.qtyTotal))
          return (
            <Link className="store" key={t.merchantId} to={`/campaign/buy/${t.merchantId}`}>
              <div className="hd">
                <b>{t.merchantName}에서 구매</b>
                {open.length === 0 ? (
                  <span className="chip y">쿠폰 마감</span>
                ) : open.length < gets.length ? (
                  <span className="chip y">일부 쿠폰 마감</span>
                ) : (
                  <span className="chip">
                    {left}/{total} 남음
                  </span>
                )}
              </div>
              <span>{gets.map((x) => `${x.merchantName} ${won(x.value)}`).join(' + ')}</span>
            </Link>
          )
        })}
      </section>

      <div className="nb row">
        <span>쿠폰 규칙과 발급·사용 기록은 참여 가게가 함께 확인해요</span>
        {/* 로컬 시연에서 무엇을 보여줄지 미정 */}
        <span className="chip b">준비 중</span>
      </div>
    </PhoneScreen>
  )
}

export default CampaignPage
