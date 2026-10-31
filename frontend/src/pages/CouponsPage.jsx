import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyCoupons } from '../api/api.js'
import { getUser } from '../auth/mockAuth.js'
import PhoneScreen from '../components/PhoneScreen.jsx'
import Ticket from '../components/Ticket.jsx'
import { useApi } from '../hooks/useApi.js'

const FILTERS = [
  { key: 'ALL', label: '전체' },
  { key: 'AVAILABLE', label: '사용 가능' },
  { key: 'USED', label: '사용 완료' },
]

// 쿠폰함 (목업 c-wallet.html의 list 화면)
function CouponsPage() {
  const user = getUser()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL')
  const { data: coupons } = useApi(() => getMyCoupons(user.id), [user.id])

  const shown = (coupons || []).filter((c) => filter === 'ALL' || c.status === filter)

  return (
    <PhoneScreen title="쿠폰함" back={false} tabs>
      <div className="seg" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.key} className={filter === f.key ? 'sel' : ''} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="tiny">보유·사용 상태는 체인 기록 기준이에요</p>

      {coupons && shown.length === 0 && (
        <div className="empty">
          <p>쿠폰이 없어요.</p>
          <p className="tiny">연합 기획전 참여 가게에서 구매하면 받을 수 있어요.</p>
        </div>
      )}

      <div className="stack">
        {shown.map((c) => (
          <div className="ticket-wrap" key={c.id}>
            <Ticket as="button" coupon={c} onClick={() => navigate(`/coupons/${c.id}`)} />
            <div className="ticket-meta">
              <span className={`chip sm ${c.status === 'USED' ? 'c-gray' : 'c-ok'}`}>{c.status === 'USED' ? '사용 완료' : '사용 가능'}</span>
              <span className="chip sm c-line">{c.source === 'CAMPAIGN' ? '연합 기획전' : '가게 쿠폰'}</span>
            </div>
          </div>
        ))}
      </div>
    </PhoneScreen>
  )
}

export default CouponsPage
