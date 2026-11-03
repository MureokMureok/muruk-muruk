import { Route } from 'react-router-dom'
import RequireRole from '../auth/RequireRole.jsx'
import { ROLES } from '../auth/mockAuth.js'
import ConsoleLayout from '../components/ConsoleLayout.jsx'
import AdminCampaign from '../pages/admin/AdminCampaign.jsx'
import AdminLedger from '../pages/admin/AdminLedger.jsx'
import AdminMerchants from '../pages/admin/AdminMerchants.jsx'

// KCP 관리자 왼쪽 메뉴 (목업 v3 K1~K3)
const ADMIN_MENU = [
  { to: '/admin', label: '가맹점 심사', icon: 'shield' },
  { to: '/admin/campaign', label: '연합 기획전 관리', icon: 'link' },
  { to: '/admin/ledger', label: '기록 조회', icon: 'list' },
]

// KCP 관리자 주소 목록 (PC) — feature/frontend-admin 브랜치 담당
// App.jsx가 이 목록을 불러서 붙인다
export function adminRoutes() {
  return (
    <Route element={<RequireRole role={ROLES.KCP} />}>
      <Route path="/admin" element={<ConsoleLayout variant="kcp" menu={ADMIN_MENU} soon="이상 거래 모니터링" />}>
        <Route index element={<AdminMerchants />} />
        <Route path="campaign" element={<AdminCampaign />} />
        <Route path="ledger" element={<AdminLedger />} />
      </Route>
    </Route>
  )
}
