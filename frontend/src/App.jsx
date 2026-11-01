import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ROLES, getUser, homePathFor } from './auth/mockAuth.js'
import ConsoleLayout from './components/ConsoleLayout.jsx'
import AdminCampaign from './pages/admin/AdminCampaign.jsx'
import AdminDeposits from './pages/admin/AdminDeposits.jsx'
import AdminLedger from './pages/admin/AdminLedger.jsx'
import AdminMerchants from './pages/admin/AdminMerchants.jsx'
import BuyPage from './pages/BuyPage.jsx'
import CampaignPage from './pages/CampaignPage.jsx'
import ConsumerHome from './pages/ConsumerHome.jsx'
import CouponDetailPage from './pages/CouponDetailPage.jsx'
import CouponHistoryPage from './pages/CouponHistoryPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import CouponOfferPage from './pages/CouponOfferPage.jsx'
import CouponsPage from './pages/CouponsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MyPage from './pages/MyPage.jsx'
import StoreCampaign from './pages/store/StoreCampaign.jsx'
import StoreDashboard from './pages/store/StoreDashboard.jsx'
import StoreIssue from './pages/store/StoreIssue.jsx'
import StoreSettle from './pages/store/StoreSettle.jsx'

// 로그인·역할 검사 문지기. 안쪽 화면들(Outlet 자리)을 감싼다.
// - 로그인 안 했으면 → 로그인 화면으로 (로그인 후 원래 화면으로 돌아오도록 next에 주소를 담음)
// - 역할이 다르면 (예: 소비자가 /admin 접근) → 자기 역할의 첫 화면으로
function RequireRole({ role }) {
  const location = useLocation()
  const user = getUser()
  if (!user) {
    const next = encodeURIComponent(location.pathname)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}

const STORE_MENU = [
  { to: '/store', label: '대시보드' },
  { to: '/store/issue', label: '쿠폰 발행' },
  { to: '/store/campaign', label: '연합 기획전' },
  { to: '/store/settle', label: '정산' },
]

const ADMIN_MENU = [
  { to: '/admin', label: '가맹점 등록' },
  { to: '/admin/deposits', label: '입금·한도' },
  { to: '/admin/campaign', label: '기획전 승인' },
  { to: '/admin/ledger', label: '체인 기록' },
]

// 주소(URL)별로 어떤 화면을 보여줄지 정하는 곳
function App() {
  return (
    <Routes>
      {/* 시작 주소: 홈. 와이어프레임 v0 확정 정책 — 비회원도 둘러보고, 로그인은 구매·쿠폰함·MY 때 */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 소비자 — 로그인 없이 볼 수 있는 화면 */}
      <Route path="/home" element={<ConsumerHome />} />
      <Route path="/campaign" element={<CampaignPage />} />
      <Route path="/campaign/coupon/:merchantId" element={<CouponOfferPage />} />
      {/* 상품 화면도 볼 수 있고, 결제 버튼을 누를 때 로그인 */}
      <Route path="/campaign/buy/:merchantId" element={<BuyPage />} />

      {/* 소비자 — 로그인이 필요한 화면 (안 했으면 로그인 → 성공 시 이 화면으로 복귀) */}
      <Route element={<RequireRole role={ROLES.CONSUMER} />}>
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/coupons/:couponId" element={<CouponDetailPage />} />
        <Route path="/coupons/:couponId/history" element={<CouponHistoryPage />} />
        <Route path="/me" element={<MyPage />} />
        <Route path="/me/settings" element={<SettingsPage />} />
      </Route>

      {/* 가맹점 콘솔 (PC) */}
      <Route element={<RequireRole role={ROLES.STORE} />}>
        <Route path="/store" element={<ConsoleLayout variant="store" roleLabel="가맹점" menu={STORE_MENU} />}>
          <Route index element={<StoreDashboard />} />
          <Route path="issue" element={<StoreIssue />} />
          <Route path="campaign" element={<StoreCampaign />} />
          <Route path="settle" element={<StoreSettle />} />
        </Route>
      </Route>

      {/* KCP 관리자 콘솔 (PC) */}
      <Route element={<RequireRole role={ROLES.KCP} />}>
        <Route path="/admin" element={<ConsoleLayout variant="kcp" roleLabel="NHN KCP 관리자" menu={ADMIN_MENU} />}>
          <Route index element={<AdminMerchants />} />
          <Route path="deposits" element={<AdminDeposits />} />
          <Route path="campaign" element={<AdminCampaign />} />
          <Route path="ledger" element={<AdminLedger />} />
        </Route>
      </Route>

      {/* 없는 주소는 시작 주소로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
