import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { SproutLoading } from './SproutLoading.jsx'
import TabBar from './TabBar.jsx'

// 소비자 화면 공통 틀 (목업 v3): 상단 바(뒤로가기 + 제목) + 내용 + (선택) 하단 고정 버튼 + (선택) 떠 있는 탭
// - title: 상단 바 제목
// - large: 상단 바 대신 내용 맨 위에 큰 제목 (쿠폰함·MY처럼 탭으로 들어오는 화면)
// - back: 뒤로가기 버튼 (결과 화면은 false — 실수로 되돌아가지 않게)
// - foot: 화면 아래 고정 버튼들 (예: 결제하기)
// - tabs: 아래 떠 있는 탭 표시
// - 내용(children)을 안 넘기면 불러오는 중으로 보고 새싹이를 보여준다 (300ms 넘게 걸릴 때만)
function PhoneScreen({ title, large, back = true, foot, tabs = false, className = '', children }) {
  const navigate = useNavigate()
  return (
    <div className={`phone-app ${className}`}>
      {!large && (
        <header className="topb">
          {back && (
            <button className="bk" aria-label="뒤로" onClick={() => navigate(-1)}>
              <Icon name="back" size={18} />
            </button>
          )}
          <h1>{title}</h1>
        </header>
      )}
      <main className={`ct ${large ? 'large-top' : ''}`}>
        {large && <h1 className="ttl-l">{large}</h1>}
        {children ?? <SproutLoading delay />}
      </main>
      {foot && <div className="cta">{foot}</div>}
      {tabs && <TabBar />}
    </div>
  )
}

export default PhoneScreen
