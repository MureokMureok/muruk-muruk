import { useState } from 'react'
import PhoneScreen from '../components/PhoneScreen.jsx'
import { getFollowSystem, setFollowSystem } from '../utils/theme.js'

// MY → 설정. 지금은 "다크 모드 · 시스템 설정에 맞추기" 하나만
function SettingsPage() {
  const [follow, setFollow] = useState(getFollowSystem())

  function toggle() {
    const next = !follow
    setFollow(next) // 스위치 모양 바꾸기
    setFollowSystem(next) // 저장하고 화면 색 바로 적용
  }

  return (
    <PhoneScreen title="설정">
      <section className="card">
        <h3 className="h-sm">화면</h3>
        <div className="switch-row">
          <div>
            <b className="ink">다크 모드</b>
            <span className="tiny" style={{ display: 'block' }}>
              시스템 설정에 맞추기 · 켜면 휴대폰이 다크 모드일 때 어둡게 보여요
            </span>
          </div>
          {/* role="switch": 화면 낭독기에 켬/끔 스위치라고 알려줌 */}
          <button className="switch" role="switch" aria-checked={follow} aria-label="다크 모드 시스템 설정에 맞추기" onClick={toggle} />
        </div>
      </section>
    </PhoneScreen>
  )
}

export default SettingsPage
