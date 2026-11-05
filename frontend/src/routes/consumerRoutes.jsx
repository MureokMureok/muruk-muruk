import { Route } from 'react-router-dom'
import RequireRole from '../auth/RequireRole.jsx'
import { ROLES } from '../auth/mockAuth.js'
import RouteErrorShell from '../components/RouteErrorShell.jsx'
import BuyPage from '../pages/consumer/BuyPage.jsx'
import CampaignPage from '../pages/consumer/CampaignPage.jsx'
import ConsumerHome from '../pages/consumer/ConsumerHome.jsx'
import CouponClaimPage from '../pages/consumer/CouponClaimPage.jsx'
import CouponDetailPage from '../pages/consumer/CouponDetailPage.jsx'
import CouponHistoryPage from '../pages/consumer/CouponHistoryPage.jsx'
import CouponOfferPage from '../pages/consumer/CouponOfferPage.jsx'
import CouponsPage from '../pages/consumer/CouponsPage.jsx'
import MyPage from '../pages/consumer/MyPage.jsx'
import SearchPage from '../pages/consumer/SearchPage.jsx'
import SettingsPage from '../pages/consumer/SettingsPage.jsx'

// 소비자 화면 주소 목록 (휴대폰 폭) — feature/frontend-consumer 브랜치 담당
// App.jsx가 이 목록을 불러서 붙인다
export function consumerRoutes() {
  return (
    // 소비자 화면 전체를 오류 처리 틀로 감쌈
    <Route element={<RouteErrorShell tabs />}>
      {/* 로그인 없이 볼 수 있는 화면 (와이어프레임 v0 확정 정책 — 비회원도 둘러보기) */}
      <Route path="/home" element={<ConsumerHome />} />
      <Route path="/campaign" element={<CampaignPage />} />
      <Route path="/campaign/coupon/:merchantId" element={<CouponOfferPage />} />
      <Route path="/offers" element={<CouponClaimPage />} />
      {/* 가게·상품 검색 (?q=검색어) */}
      <Route path="/search" element={<SearchPage />} />
      {/* 상품 화면도 볼 수 있고, 결제 버튼을 누를 때 로그인 */}
      <Route path="/campaign/buy/:merchantId" element={<BuyPage />} />

      {/* 로그인이 필요한 화면 (안 했으면 로그인 → 성공 시 이 화면으로 복귀) */}
      <Route element={<RequireRole role={ROLES.CONSUMER} />}>
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/coupons/:couponId" element={<CouponDetailPage />} />
        <Route path="/coupons/:couponId/history" element={<CouponHistoryPage />} />
        <Route path="/me" element={<MyPage />} />
        <Route path="/me/settings" element={<SettingsPage />} />
      </Route>
    </Route>
  )
}
