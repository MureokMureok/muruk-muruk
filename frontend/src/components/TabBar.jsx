import { NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'

// 소비자 화면 아래쪽 메뉴. 지금 보고 있는 화면의 버튼이 진녹색으로 표시된다(NavLink가 자동 처리).
// 목업의 '교환' 탭은 MVP 확장 범위라 일단 뺐다.
const TABS = [
  { to: '/home', icon: 'home', label: '홈' },
  { to: '/coupons', icon: 'ticket', label: '쿠폰함' },
  { to: '/me', icon: 'user', label: 'MY' },
]

function TabBar() {
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to}>
          <Icon name={t.icon} size={24} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default TabBar
