import { useState } from 'react'
import { createCampaign, getAdminCampaigns, getApprovedMerchants, setCampaignStatus } from '../../api/api.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useApi } from '../../hooks/useApi.js'
import { CAMPAIGN_STATUS, nearLimit } from '../../utils/labels.js'
import { period } from '../../utils/format.js'

// 새 기획전 만들기 (승인된 가게 중 2곳 이상)
function CreateForm({ onDone, onCancel }) {
  const { data: merchants } = useApi(() => getApprovedMerchants(), [])
  const [form, setForm] = useState({ title: '', startDate: '', endDate: '', merchantIds: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id) => setForm({ ...form, merchantIds: form.merchantIds.includes(id) ? form.merchantIds.filter((x) => x !== id) : [...form.merchantIds, id] })

  async function handleCreate() {
    setBusy(true)
    setError('')
    try {
      const c = await createCampaign(form)
      onDone(c.id)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <section className="card">
      <h2>새 기획전 만들기</h2>
      <div className="field">
        <div className="lb">기획전 이름</div>
        <div className="inp">
          <input value={form.title} placeholder="예: 연말 꽃·과일 기획전" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <div className="lb">시작일</div>
          <div className="inp">
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <div className="lb">종료일</div>
          <div className="inp">
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="field">
        <div className="lb">참여 가게 (승인된 가게)</div>
        <div className="choice">
          {merchants?.map((m) => (
            <button key={m.id} className={form.merchantIds.includes(m.id) ? 'on' : ''} onClick={() => toggle(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
        <p className="help">만든 뒤 각 가게가 가맹점 센터에서 쿠폰 조건을 등록해요</p>
      </div>
      {error && <p className="nb err">{error}</p>}
      <div className="btns">
        <button className="btn" disabled={busy} onClick={handleCreate}>
          {busy ? '기록하는 중…' : '만들기'}
        </button>
        <button className="btn g" onClick={onCancel}>
          취소
        </button>
      </div>
    </section>
  )
}

// K2 연합 기획전 관리 (목업 v3 KCP 관리자)
// 기획전을 만들고, 참여 가게의 쿠폰 조건이 모두 등록되면 시작을 승인한다. 진행 중에는 일시 중지·종료
function AdminCampaign() {
  const { data: list, reload } = useApi(() => getAdminCampaigns(), [])
  const [selId, setSelId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(false)
  if (!list) return null

  // 실서버 첫 상태처럼 기획전이 없어도 첫 기획전을 만들 수 있어야 해서 제목·만들기 폼은 따로 둔다
  const head = (
    <>
      <div className="ph1">
        <div className="tt">
          <h1>연합 기획전 관리</h1>
          <p>기획전을 만들고, 참여 가게의 쿠폰 조건이 모두 등록되면 시작을 승인해요</p>
        </div>
        {!creating && (
          <button className="btn" onClick={() => setCreating(true)}>
            새 기획전 만들기
          </button>
        )}
      </div>

      {creating && (
        <CreateForm
          onCancel={() => setCreating(false)}
          onDone={(id) => {
            setCreating(false)
            setSelId(id)
            reload()
          }}
        />
      )}
    </>
  )
  if (list.length === 0) {
    return (
      <>
        {head}
        {!creating && <p className="empty">아직 기획전이 없어요</p>}
      </>
    )
  }

  const c = list.find((x) => x.id === selId) ?? list[0]
  const st = CAMPAIGN_STATUS[c.status]
  const registered = c.terms.filter((t) => t.registered).length
  const near = c.terms.filter(nearLimit)

  // 손님 흐름에서 가장 많은 칸
  let top = null
  c.flow.forEach((row) =>
    row.cells.forEach((n, i) => {
      if (n && (!top || n > top.n)) top = { from: row.name, to: c.flow[i].name, n, r: row.merchantId, i }
    }),
  )

  function selectCampaign(id) {
    setSelId(id)
    setError('')
  }

  async function handleStatus(next) {
    setEnding(false)
    setBusy(true)
    setError('')
    try {
      await setCampaignStatus(c.id, next)
      await reload()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <>
      {ending && <ConfirmDialog message={`${c.title}을(를) 종료할까요? 종료하면 다시 진행할 수 없어요.`} confirmLabel="종료하기" danger onConfirm={() => handleStatus('ENDED')} onCancel={() => setEnding(false)} />}
      {head}

      <div className="split">
        <div className="col">
          <section className="card">
            <h2>기획전</h2>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>기획전</th>
                    <th>기간</th>
                    <th className="num">참여 가게</th>
                    <th className="num">조건 등록</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => (
                    <tr key={x.id} className={`click ${x.id === c.id ? 'sel' : ''}`} onClick={() => selectCampaign(x.id)}>
                      <td>
                        <b>{x.title}</b>
                      </td>
                      <td>{period(x)}</td>
                      <td className="num">{x.terms.length}곳</td>
                      <td className="num">
                        {x.terms.filter((t) => t.registered).length} / {x.terms.length}
                      </td>
                      <td>
                        <span className={`chip ${CAMPAIGN_STATUS[x.status].tone}`}>{CAMPAIGN_STATUS[x.status].label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>가게 간 손님 흐름</h2>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>보낸 가게 \ 받은 가게</th>
                    {c.flow.map((r) => (
                      <th key={r.merchantId} className="num">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.flow.map((row) => (
                    <tr key={row.merchantId}>
                      <td>
                        <b>{row.name}</b>
                      </td>
                      {row.cells.map((n, i) =>
                        n === null ? (
                          <td key={i} className="self" />
                        ) : (
                          <td key={i} className="num">
                            {top && top.r === row.merchantId && top.i === i ? <span className="chip">{n}</span> : n}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              {top ? `${top.from}에서 ${top.to}로 가는 흐름이 가장 많아요. 다음 기획전 조합에 참고하세요` : '아직 쿠폰 사용 기록이 없어요'} (숫자 = 보낸 가게 구매로 받은 쿠폰을 받은 가게에서 실제로 쓴 수)
            </p>
          </section>
        </div>

        <section className="card">
          <div className="hd">
            <h2>{c.title}</h2>
            <span className={`chip ${st.tone}`}>{st.label}</span>
          </div>
          <dl className="kv">
            <dt>기간</dt>
            <dd>{period(c)}</dd>
            <dt>연결 규칙</dt>
            <dd>한 곳 구매하면 나머지 쿠폰</dd>
            <dt>참여 가게</dt>
            <dd>{c.terms.map((t) => t.merchantName).join(', ')}</dd>
            <dt>쿠폰 조건</dt>
            <dd>
              {registered} / {c.terms.length} 등록 {registered === c.terms.length ? <span className="chip">완료</span> : <span className="chip y">대기</span>}
            </dd>
            <dt>한도 임박</dt>
            <dd>
              {near.length > 0 ? (
                <>
                  {near.map((t) => `${t.merchantName} (${t.issued}/${t.qtyTotal})`).join(', ')} <span className="chip y">임박</span>
                </>
              ) : (
                '없음'
              )}
            </dd>
          </dl>
          {error && <p className="nb err">{error}</p>}
          {c.status === 'PREPARING' && (
            <>
              {registered < c.terms.length && <p className="nb warn">조건을 등록하지 않은 가게: {c.terms.filter((t) => !t.registered).map((t) => t.merchantName).join(', ')}</p>}
              <button className="btn blk" disabled={busy || registered < c.terms.length} onClick={() => handleStatus('ACTIVE')}>
                {busy ? '기록하는 중…' : '시작 승인하기'}
              </button>
            </>
          )}
          {c.status === 'ACTIVE' && (
            <button className="btn g blk" disabled={busy} onClick={() => handleStatus('PAUSED')}>
              일시 중지
            </button>
          )}
          {c.status === 'PAUSED' && (
            <button className="btn blk" disabled={busy} onClick={() => handleStatus('ACTIVE')}>
              다시 진행
            </button>
          )}
          {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
            <button className="btn r blk" disabled={busy} onClick={() => setEnding(true)}>
              종료하기
            </button>
          )}
          {c.status === 'ENDED' && <p className="nb">종료된 기획전이에요. 이미 받은 쿠폰은 유효기간까지 쓸 수 있어요.</p>}
          <p className="muted" style={{ fontSize: 12.5 }}>
            KCP가 바꿀 수 있는 범위는 회의에서 정해요
          </p>
        </section>
      </div>
    </>
  )
}

export default AdminCampaign
