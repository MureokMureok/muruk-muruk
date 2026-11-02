import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyCoupons } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { useApi } from '../../hooks/useApi.js'

// 탭 3개 (확정): 사용 가능 / 사용 완료 / 만료
const TABS = [
  { key: 'AVAILABLE', label: '사용 가능', empty: '사용할 수 있는 쿠폰이 없어요' },
  { key: 'USED', label: '사용 완료', empty: '아직 사용한 쿠폰이 없어요' },
  { key: 'EXPIRED', label: '만료', empty: '만료된 쿠폰이 없어요' },
]

// ⑥ 쿠폰함 (소비자 와이어프레임 v0)
function CouponsPage() {
  const user = getUser()
  const [tab, setTab] = useState('AVAILABLE')
  const { data: coupons } = useApi(() => getMyCoupons(user.id), [user.id])

  const count = (key) => (coupons || []).filter((c) => c.status === key).length
  // 만료 임박순: 유효기간이 빠른 것부터
  const shown = (coupons || []).filter((c) => c.status === tab).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
  const current = TABS.find((t) => t.key === tab)

  return (
    <PhoneScreen title={`쿠폰함 ${coupons ? coupons.length + '장' : ''}`} back={false} tabs>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label} {count(t.key)}
          </button>
        ))}
      </div>
      {shown.length > 0 && <p className="tiny right">만료 임박순</p>}

      {coupons && shown.length === 0 && (
        <div className="empty">
          <p className="ink">{current.empty}</p>
          {tab === 'AVAILABLE' && (
            <>
              <p className="tiny">연합 기획전 가게에서 구매하면 자동으로 받아요</p>
              <Link className="pill p-ghost" to="/campaign" style={{ marginTop: 14 }}>
                진행 중인 기획전 보기
              </Link>
            </>
          )}
        </div>
      )}

      <div className="stack">
        {shown.map((c) => (
          <CouponCard key={c.id} coupon={c} caption={`${c.source === 'CAMPAIGN' ? c.title : '가게 쿠폰'} · ${c.merchantName}`} to={`/coupons/${c.id}`} />
        ))}
      </div>
      <p className="tiny">쿠폰 상태는 발급·사용 기록을 기준으로 표시돼요</p>
    </PhoneScreen>
  )
}

export default CouponsPage
