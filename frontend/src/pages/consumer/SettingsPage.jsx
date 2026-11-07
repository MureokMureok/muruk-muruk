import { useEffect, useState } from 'react'
import PhoneScreen from '../../components/PhoneScreen.jsx'
import { getDarkMode, getFollowSystem, onSystemChange, setDarkMode, setFollowSystem, systemIsDark } from '../../utils/theme.js'

// 켬/끔 스위치 한 줄
function SwitchRow({ title, desc, on, disabled, onToggle }) {
  return (
    <div className={`switch-row ${disabled ? 'is-disabled' : ''}`}>
      <div>
        <b>{title}</b>
        <small>{desc}</small>
      </div>
      {/* role="switch": 화면 낭독기에 켬/끔 스위치라고 알려줌 */}
      <button className="switch" role="switch" aria-checked={on} aria-label={title} disabled={disabled} onClick={onToggle} />
    </div>
  )
}

// MY → 설정 → 화면: "다크 모드" + "시스템 설정에 맞추기" 스위치 2개 (목업에는 없음 — 직접 추가한 기능)
// 시스템 설정에 맞추기를 켜면 다크 모드 스위치는 시스템 상태를 보여주기만 하고 직접 못 바꿈
function SettingsPage() {
  const [follow, setFollow] = useState(getFollowSystem())
  const [dark, setDark] = useState(getDarkMode())
  const [sysDark, setSysDark] = useState(systemIsDark())

  // 설정 화면을 보는 중에 시스템 다크/라이트가 바뀌어도 스위치 표시를 맞춤
  useEffect(() => onSystemChange(() => setSysDark(systemIsDark())), [])

  function toggleFollow() {
    const next = !follow
    setFollow(next) // 스위치 모양 바꾸기
    setFollowSystem(next) // 저장하고 화면 색 바로 적용
  }

  function toggleDark() {
    const next = !dark
    setDark(next)
    setDarkMode(next)
  }

  return (
    <PhoneScreen title="설정">
      <section className="grp">
        <h3 className="h4">화면</h3>
        <div className="menu">
          <SwitchRow
            title="다크 모드"
            desc={follow ? `시스템 설정을 따르는 중 · 지금 ${sysDark ? '다크' : '라이트'}` : '켜면 화면이 어둡게 보여요'}
            on={follow ? sysDark : dark}
            disabled={follow}
            onToggle={toggleDark}
          />
          <SwitchRow title="시스템 설정에 맞추기" desc="휴대폰·PC가 다크 모드일 때 자동으로 어둡게 보여요" on={follow} onToggle={toggleFollow} />
        </div>
      </section>
    </PhoneScreen>
  )
}

export default SettingsPage
