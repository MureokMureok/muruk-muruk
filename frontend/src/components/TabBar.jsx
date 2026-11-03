import { NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'

// 소비자 화면 아래 떠 있는 탭 (가이드 6의 연두 바)
// 목업의 "가운데 흰 원(쿠폰함)"은 시야를 가려서 빼고, 세 칸을 똑같이 둔다 (2026-11-03 박승건 요청)
// 지금 보고 있는 화면의 탭은 NavLink가 자동으로 'active' 표시를 붙인다 → 검은 글자·굵게로 위치 표시
// 비회원이 쿠폰함·MY를 누르면 문지기(RequireRole)가 로그인 → 로그인 후 그 화면으로 보낸다
function TabBar() {
  return (
    <nav className="tab" aria-label="하단 메뉴">
      <NavLink className="t" to="/home">
        <Icon name="home" size={22} />
        <span>홈</span>
      </NavLink>
      <NavLink className="t" to="/coupons">
        <Icon name="ticket" size={22} />
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
