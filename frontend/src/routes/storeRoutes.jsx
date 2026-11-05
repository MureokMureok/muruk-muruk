import { Route } from 'react-router-dom'
import RequireRole from '../auth/RequireRole.jsx'
import { ROLES } from '../auth/mockAuth.js'
import RouteErrorShell from '../components/RouteErrorShell.jsx'
import StoreBurden from '../pages/store/StoreBurden.jsx'
import StoreCampaign from '../pages/store/StoreCampaign.jsx'
import StoreCoupons from '../pages/store/StoreCoupons.jsx'
import StoreDashboard from '../pages/store/StoreDashboard.jsx'
import StoreGate from '../pages/store/StoreGate.jsx'
import StoreTerms from '../pages/store/StoreTerms.jsx'

// 가맹점 센터 왼쪽 메뉴 (목업 v3 M1~M4)
const STORE_MENU = [
  { to: '/store', label: '대시보드', icon: 'grid' },
  { to: '/store/campaign', label: '연합 기획전', icon: 'link' },
  { to: '/store/terms', label: '쿠폰 조건 설정', icon: 'sliders' },
  { to: '/store/coupons', label: '일반 쿠폰 발행', icon: 'ticket' },
  { to: '/store/burden', label: '할인 부담 내역', icon: 'receipt' },
]

// 가맹점 센터 주소 목록 (PC) — feature/frontend-store 브랜치 담당
// App.jsx가 이 목록을 불러서 붙인다
export function storeRoutes() {
  return (
    <Route element={<RouteErrorShell />}>
      <Route element={<RequireRole role={ROLES.STORE} />}>
        <Route path="/store" element={<StoreGate menu={STORE_MENU} />}>
          <Route index element={<StoreDashboard />} />
          <Route path="campaign" element={<StoreCampaign />} />
          <Route path="terms" element={<StoreTerms />} />
          <Route path="coupons" element={<StoreCoupons />} />
          <Route path="burden" element={<StoreBurden />} />
        </Route>
      </Route>
    </Route>
  )
}
