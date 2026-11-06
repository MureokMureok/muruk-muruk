import { useState } from 'react'
import { getMerchants, reviewMerchant } from '../../api/api.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useApi } from '../../hooks/useApi.js'
import { MERCHANT_STATUS } from '../../utils/labels.js'
import { mmdd } from '../../utils/format.js'

// 타깃 카테고리: 농수산물·꽃 (인수인계 5절 [확정])
const TARGET = ['꽃·식물', '제철 과일', '농산물', '수산물']

// K1 가맹점 심사 (목업 v3 KCP 관리자) — 예전 "가맹점 등록(화이트리스트)" 대신
// 승인된 가게만 연합 기획전에 참여하고 쿠폰 조건을 등록할 수 있다
function AdminMerchants() {
  const { data: list, reload } = useApi(() => getMerchants(), [])
  const [selId, setSelId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rejecting, setRejecting] = useState(false)
  if (!list) return null

  // 기본 선택: 심사 대기 중인 첫 가게
  const m = list.find((x) => x.id === selId) ?? list.find((x) => x.status === 'APPLIED') ?? list[0]
  const waiting = list.filter((x) => x.status === 'APPLIED').length

  async function handleReview(approve) {
    setRejecting(false)
    setBusy(true)
    setError('')
    try {
      await reviewMerchant(m.id, approve)
    } catch (err) {
      setError(err.message)
    } finally {
      await reload() // 실패했어도 다른 탭에서 바뀐 상태를 보여 준다
      setBusy(false)
    }
  }

  function selectMerchant(id) {
    setSelId(id)
    setError('')
  }

  return (
    <>
      {rejecting && <ConfirmDialog message={`${m.name}의 참여 신청을 반려할까요?`} confirmLabel="반려하기" danger onConfirm={() => handleReview(false)} onCancel={() => setRejecting(false)} />}
      <div className="ph1">
        <div className="tt">
          <h1>가맹점 심사</h1>
          <p>승인된 가게만 연합 기획전에 참여하고 쿠폰 조건을 등록할 수 있어요</p>
        </div>
      </div>
      <div className="split">
        <section className="card">
          <div className="hd">
            <h2>참여 신청</h2>
            <span className="chip g">
              {list.length}건 · 심사 대기 {waiting}건
            </span>
          </div>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>가게</th>
                  <th>업종</th>
                  <th>신청일</th>
                  <th>KCP 결제</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id} className={`click ${x.id === m.id ? 'sel' : ''}`} onClick={() => selectMerchant(x.id)}>
                    <td>
                      <b>{x.name}</b>
                    </td>
                    <td>{x.category}</td>
                    <td>{mmdd(x.appliedAt)}</td>
                    <td className={x.kcpPay ? '' : 'muted'}>{x.kcpPay ? '사용 중' : '미사용'}</td>
                    <td>
                      <span className={`chip ${MERCHANT_STATUS[x.status].tone}`}>{MERCHANT_STATUS[x.status].label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="hd">
            <h2>{m.name}</h2>
            <span className={`chip ${MERCHANT_STATUS[m.status].tone}`}>{MERCHANT_STATUS[m.status].label}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip g">{m.category}</span>
            {TARGET.includes(m.category) && <span className="chip dk">타깃 카테고리</span>}
          </div>
          <dl className="kv">
            <dt>사업자 확인</dt>
            <dd>{m.bizChecked ? '완료' : '확인 전'}</dd>
            <dt>판매 채널</dt>
            <dd>{m.channel}</dd>
            <dt>KCP 결제</dt>
            <dd>{m.kcpPay ? '사용 중' : '미사용'}</dd>
            <dt>월 거래 규모</dt>
            <dd>{m.scale} (예시)</dd>
          </dl>
          {error && <p className="nb err">{error}</p>}
          {m.status === 'APPLIED' ? (
            <>
              <div className="nb ok">승인하면 쿠폰을 등록할 수 있는 가게 목록에 추가돼요</div>
              <button className="btn blk" disabled={busy} onClick={() => handleReview(true)}>
                {busy ? '기록하는 중…' : '승인하기'}
              </button>
              <button className="btn r blk" disabled={busy} onClick={() => setRejecting(true)}>
                반려하기
              </button>
            </>
          ) : (
            <div className="nb">{m.status === 'APPROVED' ? '승인된 가게예요. 새 연합 기획전에 참여 가게로 넣을 수 있어요.' : m.status === 'SUSPENDED' ? '일시 정지된 가게예요.' : '반려된 가게예요.'}</div>
          )}
        </section>
      </div>
    </>
  )
}

export default AdminMerchants
