import { useState } from 'react'
import { getMerchants, whitelistMerchant } from '../../api/api.js'
import AuthScope from '../../components/AuthScope.jsx'
import MerchantMark from '../../components/MerchantMark.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'

// 가맹점 등록: 신청 확인 → 지갑 화이트리스트 (목업 a-console.html의 merchants)
function AdminMerchants() {
  const { data: merchants, reload } = useApi(() => getMerchants(), [])
  const [busy, setBusy] = useState(null) // 처리 중인 가맹점 id

  async function handleWhitelist(id) {
    setBusy(id)
    await whitelistMerchant(id)
    setBusy(null)
    reload()
  }

  return (
    <>
      <header className="page-h">
        <span className="cap">KCP 관리자 · 가맹점 온보딩</span>
        <h1>가맹점 등록</h1>
        <p className="subtle">확인 → 화이트리스트 → 입금 → 한도 등록</p>
      </header>
      <AuthScope />
      <section className="panel">
        <div className="panel-h">
          <h2>가맹점</h2>
          <span className="tiny">{merchants?.length ?? 0}곳</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>가맹점</th>
              <th>업종</th>
              <th>신청일</th>
              <th>발행 한도</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(merchants || []).map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="hstack">
                    <MerchantMark m={m} size="sm" /> {m.name}
                  </span>
                </td>
                <td>{m.category}</td>
                <td>{m.appliedAt}</td>
                <td>{m.limit ? won(m.limit) : '—'}</td>
                <td>{m.status === 'WHITELISTED' ? <span className="chip sm c-ok">화이트리스트 등록됨</span> : <span className="chip sm c-wait">확인 대기</span>}</td>
                <td className="right">
                  {m.status !== 'WHITELISTED' && (
                    <button className="pill xs p-forest" disabled={busy === m.id} onClick={() => handleWhitelist(m.id)}>
                      {busy === m.id ? '등록 중…' : '확인 · 화이트리스트 등록'}
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

export default AdminMerchants
