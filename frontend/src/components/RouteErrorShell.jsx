import { Outlet, useLocation } from 'react-router-dom'
import NetworkErrorBoundary from './NetworkErrorBoundary.jsx'

// 화면 묶음 전체를 오류 처리 틀로 감싼다. 주소가 바뀌면 오류 표시를 지운다
// tabs: 오류 화면에 소비자 하단 탭을 함께 보여줄지
function RouteErrorShell({ tabs = false }) {
  const { pathname } = useLocation()
  return (
    <NetworkErrorBoundary resetKey={pathname} tabs={tabs}>
      <Outlet />
    </NetworkErrorBoundary>
  )
}

export default RouteErrorShell
