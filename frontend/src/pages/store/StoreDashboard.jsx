import { Link } from 'react-router-dom'
import { benefitText, getStoreDashboard } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import { useApi } from '../../hooks/useApi.js'
import { blockNo, won } from '../../utils/format.js'
import { CAMPAIGN_STATUS, RECEIVE_LABEL } from '../../utils/labels.js'

// 가맹점 대시보드 (목업 m-console.html의 dashboard)
function StoreDashboard() {
  const user = getUser()
  const { data } = useApi(() => getStoreDashboard(user.merchantId), [user.merchantId])
  if (!data) return null
  const { merchant: m, issuances, campaignTerm, campaignStatus, campaignTitle, recentLedger } = data

  return (
    <>
      <header className="page-h">
        <span className="cap">가맹점 대시보드</span>
        <h1>안녕하세요, {m.name}</h1>
      </header>

      {m.limit === 0 && (
        <p className="notice">아직 발행 한도가 없어요. KCP가 예치금 입금을 확인하고 한도를 등록하면 쿠폰을 발행할 수 있어요.</p>
      )}

      <div className="kpis">
        <div className="kpi hl">
          <span className="cap">남은 발행 한도</span>
          <b>{won(m.remaining)}</b>
        </div>
        <div className="kpi">
          <span className="cap">등록된 한도 (예치금)</span>
          <b>{won(m.limit)}</b>
        </div>
        <div className="kpi">
          <span className="cap">발행한 쿠폰 금액</span>
          <b>{won(issuances.reduce((s, is) => s + is.total, 0))}</b>
        </div>
        <div className="kpi">
          <span className="cap">기획전 충전금</span>
          <b>{won(campaignTerm?.signed ? campaignTerm.fund : 0)}</b>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h">
          <h2>진행 중인 쿠폰</h2>
          <Link className="pill sm p-forest" to="/store/issue">
            새로 발행
          </Link>
        </div>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>쿠폰명</th>
                <th>발급 조건</th>
                <th>할인</th>
                <th>발급·사용</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {issuances.map((is) => (
                <tr key={is.id}>
                  <td>{is.name}</td>
                  <td>{RECEIVE_LABEL[is.receive]}</td>
                  <td>{benefitText(is)}</td>
                  <td>
                    {is.qty}장 중 {is.issuedCount}장 발급 · {is.usedCount}장 사용
                  </td>
                  <td>
                    <span className="chip sm c-ok">진행 중</span>
                  </td>
                </tr>
              ))}
              {campaignTerm && (
                <tr>
                  <td>{campaignTitle}</td>
                  <td>기획전</td>
                  <td>{benefitText(campaignTerm)}</td>
                  <td>충전금 {won(campaignTerm.fund)}</td>
                  <td>
                    <span className={`chip sm ${CAMPAIGN_STATUS[campaignStatus].cls}`}>{CAMPAIGN_STATUS[campaignStatus].label}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>최근 체인 기록</h2>
          <span className="lane on">온체인</span>
        </div>
        {recentLedger.length === 0 && <p className="empty">기록이 없어요.</p>}
        {recentLedger.map((l) => (
          <div className="lrow" key={l.block}>
            <div className="meta grow">
              <b>{l.label}</b>
              <span className="tiny">
                {l.detail} · 블록 {blockNo(l.block)}
              </span>
            </div>
            <span className="tiny">{l.at}</span>
          </div>
        ))}
      </section>
    </>
  )
}

export default StoreDashboard
