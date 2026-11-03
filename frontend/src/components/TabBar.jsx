import { NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'

// 소비자 화면 아래 떠 있는 탭 (가이드 6): 연두 바 + 가운데 흰 원(쿠폰함 — 이 앱의 중심)
// 지금 보고 있는 화면의 탭은 NavLink가 자동으로 'active' 표시를 붙인다.
// 비회원이 쿠폰함·MY를 누르면 문지기(RequireRole)가 로그인 → 로그인 후 그 화면으로 보낸다
function TabBar() {
  return (
    <nav className="tab" aria-label="하단 메뉴">
      <NavLink className="t" to="/home">
        <Icon name="home" size={22} />
        <span>홈</span>
      </NavLink>
      <NavLink className="t mid" to="/coupons">
        <span className="o">
          <Icon name="ticket" size={24} />
        </span>
        <span>쿠폰함</span>
      </NavLink>
      <NavLink className="t" to="/me">
        <Icon name="user" size={22} />
        <span>MY</span>
      </NavLink>
    </nav>
  )
}

export default TabBar
