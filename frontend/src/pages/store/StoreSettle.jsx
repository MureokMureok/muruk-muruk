import { getSettlement } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

// 정산 (목업 m-console.html의 settle). 사용된 할인액만 정산된다
function StoreSettle() {
  const user = getUser()
  const { data } = useApi(() => getSettlement(user.merchantId), [user.merchantId])
  if (!data) return null

  return (
    <>
      <header className="page-h">
        <span className="cap">정산·이력</span>
        <h1>정산</h1>
        <p className="subtle">사용된 할인액만 정산돼요 · 체인 기록 기준</p>
      </header>

      <div className="kpis three">
        <div className="kpi">
          <span className="cap">이번 기획전 할인 부담</span>
          <b>{won(data.campaignBurden)}</b>
        </div>
        <div className="kpi hl">
          <span className="cap">종료 후 돌려받을 충전금</span>
          <b>{won(data.campaignRefund)}</b>
        </div>
        <div className="kpi">
          <span className="cap">가게 쿠폰 사용 할인액</span>
          <b>{won(data.issuanceUsed)}</b>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h">
          <h2>정산 내역</h2>
          <span className="tiny">{data.rows.length}건</span>
        </div>
        {data.rows.length === 0 ? (
          <p className="empty">아직 우리 가게에서 사용된 쿠폰이 없어요.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>일시</th>
                <th>쿠폰</th>
                <th>고객</th>
                <th>주문 금액</th>
                <th>할인액</th>
                <th>정산 상태</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.at}</td>
                  <td>{r.couponSource === 'CAMPAIGN' ? '연합 기획전' : r.couponTitle}</td>
                  <td>{r.customer}</td>
                  <td>{won(r.amount)}</td>
                  <td>{won(r.discount)}</td>
                  <td>
                    <span className="chip sm c-ok">완료 (모의)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="tiny" style={{ marginTop: 12 }}>
          고객 이름은 가려서 보여줘요 (구매자 정보 범위는 팀 확인 필요)
        </p>
      </section>
    </>
  )
}

export default StoreSettle
