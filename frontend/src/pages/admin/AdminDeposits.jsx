import { useState } from 'react'
import { getDeposits, registerLimit } from '../../api/api.js'
import ChainProgress from '../../components/ChainProgress.jsx'
import { runWithSteps } from '../../utils/runWithSteps.js'
import MerchantMark from '../../components/MerchantMark.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

const STEPS = ['입금 확인 (오프체인)', '관리자 서명', '한도 기록', '블록 확정']

// 입금 확인 → 발행 한도 등록 (목업 a-console.html의 deposits). 시연 1장면
function AdminDeposits() {
  const { data: deposits, reload } = useApi(() => getDeposits(), [])
  const [running, setRunning] = useState(null) // 처리 중인 입금 id
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  async function handleRegister(id) {
    setError('')
    setRunning(id)
    try {
      await runWithSteps(() => registerLimit(id), STEPS.length, setStep)
      await reload()
    } catch (err) {
      setError(err.message)
    }
    setTimeout(() => setRunning(null), 600)
  }

  return (
    <>
      <header className="page-h">
        <span className="cap">KCP 관리자 · 온체인 등록</span>
        <h1>입금 확인 → 한도 등록</h1>
        <p className="subtle">입금이 확인된 금액만큼만 발행 한도로 등록해요. 서버가 체인에 직접 쓰는 단계예요.</p>
      </header>

      {error && <p className="notice bad">{error}</p>}
      {running && (
        <div className="panel">
          <ChainProgress steps={STEPS} step={step} />
        </div>
      )}

      <section className="panel">
        <div className="panel-h">
          <h2>입금 내역</h2>
          <span className="tiny">금액은 모두 예시예요</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>입금 시각</th>
              <th>가맹점</th>
              <th>입금액</th>
              <th>계좌 확인</th>
              <th>한도 등록</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(deposits || []).map((d) => (
              <tr key={d.id}>
                <td>{d.at}</td>
                <td>
                  <span className="hstack">
                    <MerchantMark m={d} size="sm" /> {d.merchantName}
                  </span>
                </td>
                <td>{won(d.amount)}</td>
                <td>
                  <span className="chip sm c-ok">입금 확인</span>
                </td>
                <td>{d.status === 'REGISTERED' ? <span className="chip sm c-ok">등록 완료</span> : <span className="chip sm c-wait">등록 대기</span>}</td>
                <td className="right">
                  {d.status !== 'REGISTERED' && (
                    <button className="pill xs p-forest" disabled={!!running} onClick={() => handleRegister(d.id)}>
                      한도 등록
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

export default AdminDeposits
