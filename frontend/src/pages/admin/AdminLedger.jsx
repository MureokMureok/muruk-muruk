import { useState } from 'react'
import { getLedger } from '../../api/api.js'
import { useApi } from '../../hooks/useApi.js'
import { blockNo } from '../../utils/format.js'

const FILTERS = [
  { key: 'ALL', label: '전체' },
  { key: 'ISSUE', label: '발행·발급' },
  { key: 'USE', label: '사용·거절' },
  { key: 'ADMIN', label: '관리' },
]

// 체인 기록 조회 (목업 a-console.html의 ledger). 시연 8장면
function AdminLedger() {
  const { data: ledger } = useApi(() => getLedger(), [])
  const [filter, setFilter] = useState('ALL')
  const rows = (ledger || []).filter((l) => filter === 'ALL' || l.type === filter)

  return (
    <>
      <header className="page-h">
        <span className="cap">KCP 관리자 · 변경 불가 기록</span>
        <h1>체인 기록 조회</h1>
        <p className="subtle">서버가 아니라 체인에 기록된 내용이에요. (지금은 모의 기록)</p>
      </header>

      <section className="panel">
        <div className="panel-h">
          <div className="seg">
            {FILTERS.map((f) => (
              <button key={f.key} className={filter === f.key ? 'sel' : ''} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="tiny">{rows.length}건</span>
        </div>
        {rows.length === 0 ? (
          <p className="empty">해당 이벤트가 없어요.</p>
        ) : (
          <table className="tbl ledger-table">
            <thead>
              <tr>
                <th>블록</th>
                <th>시각</th>
                <th>이벤트</th>
                <th>내용</th>
                <th>주체</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.block}>
                  <td>{blockNo(l.block)}</td>
                  <td>{l.at}</td>
                  <td>
                    <span className={`chip sm ${l.label === '사용 거절' ? 'c-bad' : l.type === 'USE' ? 'c-info' : l.type === 'ISSUE' ? 'c-ok' : 'c-gray'}`}>{l.label}</span>
                  </td>
                  <td>{l.detail}</td>
                  <td>{l.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}

export default AdminLedger
