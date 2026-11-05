import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyCoupons } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import CouponCard from '../../components/CouponCard.jsx'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import StatusView from '../../components/StatusView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { dDay, mmdd, won } from '../../utils/format.js'

// 탭 3개 (확정): 사용 가능 / 사용 완료 / 만료 — 탭마다 다른 빈 상태 문구
// 상태는 6개지만 탭은 3개 유지. 잠김·사용 처리 중은 해당 탭에서 배지로 보여준다 (정책표 3번 시트 No.3)
// 소멸(VOIDED)은 어느 탭에도 넣지 않아 쿠폰함에 보이지 않는다 ("표시 안 함 또는 만료 탭" — 팀 협의 전까지 표시 안 함)
const TABS = [
  { key: 'USABLE', statuses: ['LOCKED', 'AVAILABLE'], label: '사용 가능', empty: '사용할 수 있는 쿠폰이 없어요' },
  { key: 'DONE', statuses: ['PROCESSING', 'USED'], label: '사용 완료', empty: '아직 사용한 쿠폰이 없어요' },
  { key: 'EXPIRED', statuses: ['EXPIRED'], label: '만료', empty: '만료된 쿠폰이 없어요' },
]

// 정렬 (탭을 바꿔도 유지)
const SORTS = {
  expiry: { label: '만료 임박순', fn: (a, b) => a.expiresAt.localeCompare(b.expiresAt) },
  recent: { label: '최근 받은 순', fn: (a, b) => b.issuedAt.localeCompare(a.issuedAt) },
}

// C-06 쿠폰함 (목업 v3) + 쿠폰함 빈 상태
function CouponsPage() {
  const user = getUser()
  const [tab, setTab] = useState('USABLE')
  const [sort, setSort] = useState('expiry')
  const { data: coupons } = useApi(() => getMyCoupons(user.id), [user.id])

  const inTab = (key) => (coupons || []).filter((c) => TABS.find((t) => t.key === key).statuses.includes(c.status))
  const count = (key) => inTab(key).length
  const shown = inTab(tab).sort(SORTS[sort].fn)
  const current = TABS.find((t) => t.key === tab)

  return (
    <PhoneScreen
      large={
        <>
          쿠폰함 <em>{count('USABLE')}장</em>
        </>
      }
      tabs
    >
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label} {count(t.key)}
          </button>
        ))}
      </div>

      {coupons && shown.length === 0 && (
        <StatusView kind="empty" title={current.empty} desc={tab === 'USABLE' && <>연합 기획전 가게에서 구매하면<br />다른 가게 쿠폰을 받아요</>}>
          {tab === 'USABLE' && (
            <Link className="btn g sm" to="/campaign" style={{ alignSelf: 'center' }}>
              진행 중인 기획전 보기
            </Link>
          )}
        </StatusView>
      )}

      {shown.length > 0 && (
        <>
          <select className="sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
          {shown.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              sub={`${won(c.minOrder)} 이상 · ${mmdd(c.expiresAt)}까지${c.status === 'AVAILABLE' ? ` (D-${dDay(c.expiresAt)})` : ''}`}
              to={`/coupons/${c.id}`}
            />
          ))}
          <p className="cap">쿠폰 상태는 발급·사용 기록을 기준으로 보여드려요</p>
        </>
      )}
    </PhoneScreen>
  )
}

export default CouponsPage
