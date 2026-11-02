import { Route } from 'react-router-dom'
import RequireRole from '../auth/RequireRole.jsx'
import { ROLES } from '../auth/mockAuth.js'
import ConsoleLayout from '../components/ConsoleLayout.jsx'
import AdminCampaign from '../pages/admin/AdminCampaign.jsx'
import AdminDeposits from '../pages/admin/AdminDeposits.jsx'
import AdminLedger from '../pages/admin/AdminLedger.jsx'
import AdminMerchants from '../pages/admin/AdminMerchants.jsx'

// KCP 관리자 콘솔 왼쪽 메뉴
const ADMIN_MENU = [
  { to: '/admin', label: '가맹점 등록' },
  { to: '/admin/deposits', label: '입금·한도' },
  { to: '/admin/campaign', label: '기획전 승인' },
  { to: '/admin/ledger', label: '체인 기록' },
]

// KCP 관리자 콘솔 주소 목록 (PC) — feature/frontend-admin 브랜치 담당
// App.jsx가 이 목록을 불러서 붙인다
export function adminRoutes() {
  return (
    <Route element={<RequireRole role={ROLES.KCP} />}>
      <Route path="/admin" element={<ConsoleLayout variant="kcp" roleLabel="NHN KCP 관리자" menu={ADMIN_MENU} />}>
        <Route index element={<AdminMerchants />} />
        <Route path="deposits" element={<AdminDeposits />} />
        <Route path="campaign" element={<AdminCampaign />} />
        <Route path="ledger" element={<AdminLedger />} />
      </Route>
    </Route>
  )
}
