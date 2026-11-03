import { useState } from 'react'
import { getLedger } from '../../api/api.js'
import { useApi } from '../../hooks/useApi.js'
import { LEDGER_TYPE } from '../../utils/labels.js'
import { mdhm, shortTx } from '../../utils/format.js'

const FILTERS = [
  { key: 'ALL', label: '전체' },
  { key: 'ISSUE', label: '발급' },
  { key: 'USE', label: '사용' },
  { key: 'REJECT', label: '거절' },
  { key: 'ADMIN', label: '관리' },
]

// K3 기록 조회 (목업 v3 KCP 관리자) — 예전 "체인 기록 조회"
// 가게·소비자 화면과 같은 기록 번호를 쓴다 (지금은 모의 기록)
function AdminLedger() {
  const { data } = useApi(() => getLedger(), [])
  const [filter, setFilter] = useState('ALL')
  if (!data) return null

  const { stats, rows } = data
  const shown = rows.filter((l) => filter === 'ALL' || l.type === filter)

  return (
    <>
      <div className="ph1">
        <div className="tt">
          <h1>기록 조회</h1>
          <p>서버 DB가 아니라 참여 가게가 함께 보는 기록이에요. 가게·소비자 화면과 같은 기록 번호를 써요 (지금은 모의 기록)</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <small>오늘 발급</small>
          <b>{stats.issuedToday}장</b>
          <span>오늘 기준</span>
        </div>
        <div className="stat">
          <small>오늘 사용</small>
          <b>{stats.usedToday}장</b>
          <span>오늘 기준</span>
        </div>
        <div className="stat hl">
          <small>재사용 시도 거절</small>
          <b>{stats.rejected}건</b>
          <span>규칙에 따라 자동으로 막았어요</span>
        </div>
        <div className="stat">
          <small>참여 가게</small>
          <b>{stats.merchants}곳</b>
          <span>기획전 {stats.activeCampaigns}개 진행 중</span>
        </div>
      </div>
      <section className="card">
        <div className="hd">
          <div className="tabs">
            {FILTERS.map((f) => (
              <button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="chip b">블록체인 탐색기 연결은 11/26</span>
        </div>
        {shown.length === 0 ? (
          <p className="empty">해당 기록이 없어요</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>기록 번호</th>
                  <th>시각</th>
                  <th>종류</th>
                  <th>내용</th>
                  <th>주체</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id}>
                    <td className="mono" title={l.tx}>
                      {shortTx(l.tx)}
                    </td>
                    <td>{mdhm(l.at)}</td>
                    <td>
                      <span className={`chip ${LEDGER_TYPE[l.type].tone}`}>{LEDGER_TYPE[l.type].label}</span>
                    </td>
                    <td className="wrap">{l.detail}</td>
                    <td>{l.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

export default AdminLedger
