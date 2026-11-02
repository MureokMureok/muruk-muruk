import { Outlet, useLocation } from 'react-router-dom'
import NetworkErrorBoundary from './NetworkErrorBoundary.jsx'

// 소비자 화면들을 감싸는 틀: 오류 처리. 데이터를 못 불러오면 "연결이 불안정해요"
// 주소가 바뀌면 오류 표시를 지운다
function ConsumerShell() {
  const location = useLocation()
  return (
    <NetworkErrorBoundary resetKey={location.pathname}>
      <Outlet />
    </NetworkErrorBoundary>
  )
}

export default ConsumerShell
