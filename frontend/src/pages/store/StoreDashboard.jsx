import { Link } from 'react-router-dom'
import { getStoreDashboard } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import Icon from '../../components/Icon.jsx'
import { useApi } from '../../hooks/useApi.js'
import { CAMPAIGN_STATUS } from '../../utils/labels.js'
import { mdhm, period, shortTx, won } from '../../utils/format.js'
import { SproutLoading } from '../../components/SproutLoading.jsx'

// 최근 기록 한 줄: 종류별 점 색·제목·설명
function logItem(l, merchantName) {
  if (l.type === 'USE') return { dot: '', icon: 'check', title: '쿠폰 사용', sub: `${mdhm(l.at)} · ${l.customer} · ${won(l.discount)}` }
  if (l.type === 'APPLY') return { dot: 'm', icon: 'ticket', title: '쿠폰 결제 적용 · 처리 중', sub: `${mdhm(l.at)} · ${l.customer} · ${won(l.discount)}` }
  if (l.type === 'CONFIRM') return { dot: 'm', icon: 'check', title: '구매 확정', sub: `${mdhm(l.at)} · ${l.customer} · ${l.summary}` }
  if (l.type === 'REFUND') return { dot: 'x', icon: 'alert', title: '주문 취소·환불', sub: `${mdhm(l.at)} · ${l.customer} · ${l.summary}` }
  if (l.type === 'REJECT') return { dot: 'x', icon: 'alert', title: l.reason === 'COUPON_ALREADY_USED' ? '재사용 시도 거절' : '사용 거절', sub: `${mdhm(l.at)} · ${l.reason === 'COUPON_ALREADY_USED' ? '같은 쿠폰' : l.summary}` }
  if (l.type === 'ISSUE' && l.claimed) return { dot: 'm', icon: 'ticket', title: '일반 쿠폰 받기', sub: `${mdhm(l.at)} · ${l.customer}` }
  if (l.type === 'ISSUE') return { dot: 'm', icon: 'ticket', title: '쿠폰 발급', sub: `${mdhm(l.at)} · ${l.actor === merchantName ? '우리 가게' : l.actor} 구매` }
  return { dot: 'm', icon: 'sliders', title: '관리', sub: `${mdhm(l.at)} · ${l.detail}` }
}

// M1 대시보드 (목업 v3 가맹점 센터) — 숫자는 모두 모의 데이터 기준
function StoreDashboard() {
  const user = getUser()
  const { data: d } = useApi(() => getStoreDashboard(user.merchantId), [user.merchantId])
  if (!d) return <SproutLoading delay />

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)

  return (
    <>
      <div className="ph1">
        <div className="tt">
          <h1>안녕하세요, {d.merchant.name} 사장님</h1>
          <p>
            {Number(d.asOf.slice(5, 7))}월 {Number(d.asOf.slice(8, 10))}일 기준 · 시연용 모의 데이터예요
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <small>참여 중인 기획전</small>
          <b>{d.activeCount}개</b>
          <span>{d.activeTitle || '진행 중인 기획전이 없어요'}</span>
        </div>
        <div className="stat">
          <small>우리 쿠폰 발급</small>
          <b>{d.issued}장</b>
          <div className="meter">
            <i style={{ width: `${pct(d.issued, d.qtyTotal)}%` }} />
          </div>
          <span>한도 {d.qtyTotal}장 중</span>
        </div>
        <div className="stat">
          <small>우리 쿠폰 사용</small>
          <b>{d.used}장</b>
          <span>발급 대비 {pct(d.used, d.issued)}%</span>
        </div>
        <div className="stat hl">
          <small>기획전 할인 부담</small>
          <b>{won(d.burden)}</b>
          <div className="meter">
            <i style={{ width: `${pct(d.burden, d.cap)}%` }} />
          </div>
          <span>할인 한도 {won(d.cap)} 중</span>
        </div>
      </div>

      <div className="split">
        <section className="card">
          <h2>손님 연결</h2>
          <div className="flow">
            <div className="out">
              <small>우리가 보낸 손님</small>
              <b>{d.links.sent}명</b>
              <span>우리 가게 구매로 다른 가게 쿠폰 발급</span>
            </div>
            <div className="in">
              <small>우리에게 온 손님</small>
              <b>{d.links.received}명</b>
              <span>다른 가게 구매로 받은 쿠폰을 우리 가게에서 사용</span>
            </div>
          </div>
          <div className="rows">
            {d.links.partners.map((p) => (
              <div key={p.merchantId}>
                <b>{p.name}</b>
                <span>
                  보냄 {p.sent} · 받음 {p.received}
                </span>
              </div>
            ))}
          </div>
          <p className="nb">참여 가게 모두 같은 기록을 기준으로 이 숫자를 봐요</p>
        </section>

        <section className="card">
          <div className="hd">
            <h2>최근 기록</h2>
            <Link to="/store/burden">전체 보기 ›</Link>
          </div>
          {d.recent.length === 0 && <p className="empty">아직 기록이 없어요</p>}
          <ul className="log">
            {d.recent.map((l) => {
              const it = logItem(l, d.merchant.name)
              return (
                <li key={l.id}>
                  <span className={`dot ${it.dot}`}>
                    <Icon name={it.icon} size={13} />
                  </span>
                  <div>
                    <b>{it.title}</b>
                    <small>{it.sub}</small>
                  </div>
                  <code title={l.tx}>{shortTx(l.tx)}</code>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="hd">
          <h2>참여 기획전</h2>
          <Link to="/store/campaign">연합 기획전에서 자세히 ›</Link>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>기획전</th>
                <th>기간</th>
                <th>우리 쿠폰</th>
                <th className="num">발급 / 한도</th>
                <th className="num">사용</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {d.campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.title}</b>
                  </td>
                  <td>{period(c)}</td>
                  <td>{c.mine.registered ? `${won(c.mine.value)} · ${won(c.mine.minOrder)} 이상` : <span className="muted">조건 등록 전</span>}</td>
                  <td className="num">
                    {c.mine.issued} / {c.mine.qtyTotal}장
                  </td>
                  <td className="num">{c.mine.used}장</td>
                  <td>
                    <span className={`chip ${CAMPAIGN_STATUS[c.status].tone}`}>{CAMPAIGN_STATUS[c.status].label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default StoreDashboard
