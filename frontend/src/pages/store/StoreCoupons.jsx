import { useState } from 'react'
import { getStorePolicies, publishPolicy } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import { SproutLoading, SproutOverlay } from '../../components/SproutLoading.jsx'
import { useApi } from '../../hooks/useApi.js'
import { mmdd, minOrderText, won } from '../../utils/format.js'
import NumInput from './NumInput.jsx'

const EMPTY_FORM = { name: '', value: 0, minOrder: 0, validDays: 14, quantity: 0 }

function PublishForm({ merchantId, merchantName, onPublished }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }
  const set = (key) => (v) => {
    setMsg(null)
    setForm({ ...form, [key]: v })
  }

  async function handlePublish() {
    setBusy(true)
    setMsg(null)
    try {
      await publishPolicy(merchantId, form)
      setForm(EMPTY_FORM)
      setMsg({ ok: true, text: '쿠폰을 발행했어요. 이제 손님이 받을 수 있어요.' })
      await onPublished()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="split">
      {busy && <SproutOverlay delay growing title="쿠폰을 발행하고 있어요" />}
      <section className="card">
        <h2>새 쿠폰 발행</h2>
        <div className="field">
          <div className="lb">쿠폰 이름</div>
          <div className="inp">
            <input aria-label="쿠폰 이름" maxLength={100} placeholder="예: 봄꽃상회 꽃다발 2,000원 쿠폰" value={form.name} onChange={(e) => set('name')(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <div className="lb">할인 금액</div>
          <NumInput label="할인 금액" value={form.value} onChange={set('value')} unit="원 할인" />
          <p className="help">정액 할인만 지원해요</p>
        </div>
        <div className="field">
          <div className="lb">최소 주문 금액</div>
          <NumInput label="최소 주문 금액" value={form.minOrder} onChange={set('minOrder')} unit="원 이상" />
          <p className="help">0원이면 조건 없이 쓸 수 있어요</p>
        </div>
        <div className="form-row">
          <div className="field">
            <div className="lb">유효 기간</div>
            <NumInput label="유효 기간" value={form.validDays} onChange={set('validDays')} unit="일" />
          </div>
          <div className="field">
            <div className="lb">발행 수량</div>
            <NumInput label="발행 수량" value={form.quantity} onChange={set('quantity')} unit="장" />
          </div>
        </div>
      </section>
      <div className="col">
        <section className="card">
          <h2>손님에게 이렇게 보여요</h2>
          <CouponCard coupon={{ merchantName, value: form.value, policyId: 'preview' }} badge={{ label: '바로 받기', tone: 'y' }} sub={`${minOrderText(form.minOrder)} · 받은 날부터 ${form.validDays}일`} />
        </section>
        <section className="card">
          <h2>요약</h2>
          <dl className="kv">
            <dt>받는 방법</dt>
            <dd>손님이 직접 받기 · 한 사람당 1장</dd>
            <dt>사용처</dt>
            <dd>우리 가게만</dd>
            <dt>최대 할인 부담</dt>
            <dd>
              {won(form.value * form.quantity)} ({won(form.value)} × {form.quantity}장)
            </dd>
          </dl>
          <p className="nb ok">돈을 미리 맡기지 않아요. 쿠폰이 실제로 쓰였을 때만 할인 부담이 생겨요.</p>
        </section>
        {msg && <p className={`nb ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</p>}
        <button className="btn blk" disabled={busy} onClick={handlePublish}>
          {busy ? '발행하는 중…' : '쿠폰 발행하기'}
        </button>
      </div>
    </div>
  )
}

// 기획전과 상관없이 우리 가게 쿠폰을 직접 발행하는 화면 (백엔드 "일반 쿠폰 발행")
function StoreCoupons() {
  const user = getUser()
  const { data: policies, reload } = useApi(() => getStorePolicies(user.merchantId), [user.merchantId])
  if (!policies) return <SproutLoading delay />

  return (
    <>
      <div className="ph1">
        <div className="tt">
          <h1>일반 쿠폰 발행</h1>
          <p>기획전과 상관없이 우리 가게 쿠폰을 발행해요. 손님이 직접 받아 우리 가게에서 써요</p>
        </div>
      </div>
      <PublishForm merchantId={user.merchantId} merchantName={user.name} onPublished={reload} />
      <section className="card">
        <h2>발행한 쿠폰</h2>
        {policies.length === 0 ? (
          <p className="empty">아직 발행한 쿠폰이 없어요</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>쿠폰</th>
                  <th className="num">할인</th>
                  <th>최소 주문</th>
                  <th className="num">유효 기간</th>
                  <th className="num">받음 / 발행</th>
                  <th className="num">사용</th>
                  <th>발행일</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                    </td>
                    <td className="num">{won(p.value)}</td>
                    <td>{minOrderText(p.minOrder)}</td>
                    <td className="num">{p.validDays}일</td>
                    <td className="num">
                      {p.claimed} / {p.quantity}장
                    </td>
                    <td className="num">{p.used}장</td>
                    <td>{mmdd(p.createdAt)}</td>
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

export default StoreCoupons
