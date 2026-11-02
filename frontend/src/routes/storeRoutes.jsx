import { Route } from 'react-router-dom'
import RequireRole from '../auth/RequireRole.jsx'
import { ROLES } from '../auth/mockAuth.js'
import ConsoleLayout from '../components/ConsoleLayout.jsx'
import StoreCampaign from '../pages/store/StoreCampaign.jsx'
import StoreDashboard from '../pages/store/StoreDashboard.jsx'
import StoreIssue from '../pages/store/StoreIssue.jsx'
import StoreSettle from '../pages/store/StoreSettle.jsx'

// 가맹점 콘솔 왼쪽 메뉴
const STORE_MENU = [
  { to: '/store', label: '대시보드' },
  { to: '/store/issue', label: '쿠폰 발행' },
  { to: '/store/campaign', label: '연합 기획전' },
  { to: '/store/settle', label: '정산' },
]

// 가맹점 콘솔 주소 목록 (PC) — feature/frontend-store 브랜치 담당
// App.jsx가 이 목록을 불러서 붙인다
export function storeRoutes() {
  return (
    <Route element={<RequireRole role={ROLES.STORE} />}>
      <Route path="/store" element={<ConsoleLayout variant="store" roleLabel="가맹점" menu={STORE_MENU} />}>
        <Route index element={<StoreDashboard />} />
        <Route path="issue" element={<StoreIssue />} />
        <Route path="campaign" element={<StoreCampaign />} />
        <Route path="settle" element={<StoreSettle />} />
      </Route>
    </Route>
  )
}
