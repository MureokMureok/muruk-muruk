import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoreCampaigns } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import { useApi } from '../../hooks/useApi.js'
import { CAMPAIGN_STATUS, nearLimit } from '../../utils/labels.js'
import { mdhm, period, won } from '../../utils/format.js'
import { SproutLoading } from '../../components/SproutLoading.jsx'

// 표의 상태 칩: 조건 등록 전 → 한도 임박 → 기획전 상태
function termChip(c, t) {
  if (!t.registered) return { label: '조건 등록 전', tone: 'y' }
  if (c.status === 'ACTIVE' && nearLimit(t)) return { label: '한도 임박', tone: 'y' }
  return CAMPAIGN_STATUS[c.status]
}

// M3 연합 기획전 현황 (목업 v3 가맹점 센터)
function StoreCampaign() {
  const user = getUser()
  const me = user.merchantId
  const { data: list } = useApi(() => getStoreCampaigns(me), [me])
  const [pickId, setPickId] = useState(null) // 고른 기획전 (참여 기획전이 여럿일 때)
  const [showHistory, setShowHistory] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  if (!list) return <SproutLoading delay />

  // 기본: 진행 중인 기획전, 없으면 첫 번째
  const c = list.find((x) => x.id === pickId) ?? list.find((x) => x.status === 'ACTIVE') ?? list[0]
  if (!c) return <p className="empty">참여 중인 기획전이 없어요</p>
  const st = CAMPAIGN_STATUS[c.status]

  return (
    <>
      {list.length > 1 && (
        <div className="tabs">
          {list.map((x) => (
            <button key={x.id} className={x.id === c.id ? 'on' : ''} onClick={() => setPickId(x.id)}>
              {x.title}
            </button>
          ))}
        </div>
      )}
      <div className="ph1">
        <div className="tt">
          <h1>
            {c.title} <span className={`chip ${st.tone}`}>{st.label}</span>
          </h1>
          <p>
            {period(c)} · 참여 가게 {c.terms.length}곳. 한 곳에서 사면 나머지 {c.terms.length - 1}곳 쿠폰이 발급돼요
          </p>
        </div>
      </div>

      <section className="card">
        <h2>손님이 이렇게 연결돼요</h2>
        <div className="links">
          {c.terms.map((t) => (
            <div key={t.merchantId} className={t.merchantId === me ? 'me' : ''}>
              <b>
                {t.merchantName}에서 구매{t.merchantId === me ? ' (우리)' : ''}
              </b>
              <div className="gets">
                {c.terms
                  .filter((x) => x.merchantId !== t.merchantId)
                  .map((x) => (
                    <span key={x.merchantId}>
                      {x.merchantName} {won(x.value)}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>참여 가게</h2>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>가게</th>
                <th>업종</th>
                <th>쿠폰 조건</th>
                <th className="num">발급 / 한도</th>
                <th className="num">사용</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {c.terms.map((t) => {
                const chip = termChip(c, t)
                return (
                  <tr key={t.merchantId} className={t.merchantId === me ? 'sel' : ''}>
                    <td>
                      <b>{t.merchantName}</b> {t.merchantId === me && <span className="muted">(우리)</span>}
                    </td>
                    <td>{t.merchantCategory}</td>
                    <td>{t.registered ? `${won(t.value)} · ${won(t.minOrder)} 이상` : <span className="muted">—</span>}</td>
                    <td className="num">
                      {t.issued} / {t.qtyTotal}장
                    </td>
                    <td className="num">{t.used}장</td>
                    <td>
                      <span className={`chip ${chip.tone}`}>{chip.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="nb row">
          <span>쿠폰 조건과 발급·사용 기록은 참여 가게 모두가 같은 기록을 봐요</span>
          <button className="ink" style={{ fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => setShowHistory(!showHistory)}>
            조건 변경 이력 {showHistory ? '닫기' : '보기 ›'}
          </button>
        </div>
        {showHistory && (
          <div className="rows">
            {c.history.map((h) => (
              <div key={h.id}>
                <b style={{ fontWeight: 600 }}>{h.detail}</b>
                <span>
                  {mdhm(h.at)} · {h.actor}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showGuide && (
        <section className="card mint">
          <h2>기획전 안내</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>KCP가 기획전을 만들고 참여 가게를 정해요</li>
            <li>각 가게가 우리 쿠폰 조건(할인·최소 주문·유효기간·할인 한도)을 등록해요</li>
            <li>모든 가게가 등록하면 KCP가 시작을 승인해요</li>
            <li>손님이 한 가게에서 사면 나머지 가게 쿠폰이 자동으로 발급돼요</li>
            <li>쿠폰이 실제로 쓰였을 때만 그 가게에 할인 부담이 생겨요 (돈을 미리 맡기지 않아요)</li>
          </ol>
        </section>
      )}

      <div className="btns">
        <Link className="btn" to={`/store/terms?c=${c.id}`}>
          우리 쿠폰 조건 보기
        </Link>
        <button className="btn g" onClick={() => setShowGuide(!showGuide)}>
          기획전 안내 {showGuide ? '닫기' : '보기'}
        </button>
      </div>
    </>
  )
}

export default StoreCampaign
