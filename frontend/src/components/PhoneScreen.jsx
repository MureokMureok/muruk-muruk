import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import TabBar from './TabBar.jsx'

// 소비자 화면 공통 틀: 위쪽 제목줄(뒤로 가기) + 내용 + (선택) 아래쪽 고정 버튼 영역 + (선택) 메뉴
// - back: 뒤로 가기 버튼 표시 여부
// - foot: 화면 아래에 붙는 버튼들 (예: 결제하기)
// - tabs: 아래쪽 메뉴 표시 여부
function PhoneScreen({ title, back = true, foot, tabs = false, children }) {
  const navigate = useNavigate()
  return (
    <div className="phone-app">
      <header className="appbar">
        {back && (
          <button className="icon-btn back" aria-label="뒤로" onClick={() => navigate(-1)}>
            <span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
              <Icon name="chev" />
            </span>
          </button>
        )}
        <h1 className="appbar-title">{title}</h1>
      </header>
      <main className="app-body">{children}</main>
      {foot && <div className="app-foot">{foot}</div>}
      {tabs && <TabBar />}
    </div>
  )
}

export default PhoneScreen
