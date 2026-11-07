import { useEffect, useRef, useState } from 'react'
import { shouldShowSplash } from '../utils/startup.js'

// 앱 시작 화면 (디자인 시안 "무럭무럭 시작 화면" 그대로): 다른 앱처럼 실행할 때 잠깐 나오는 애니메이션
// 로고 글자 등장 → 새싹이 글자 위로 자람 → 농산물·수산물·꽃이 차례로 등장 → 잠시 머문 뒤 사라짐 (약 3.6초)
// - 뒤에서는 앱이 이미 그려지고 있고, 시작 화면이 그 위를 덮고 있다가 사라진다
// - 언제 나올지와 뒤에 깔릴 첫 화면은 utils/startup.js가 정한다 (새 탭에서 한 번, 소비자 앱에서만)
const TOTAL_MS = 3600 // 저절로 넘어가는 시간
const MIN_MS = 1500 // 눌러서 넘겨도 이만큼은 보여준다 (시안의 개발 참고: 최소 노출 1.5초)
const FADE_MS = 500 // 사라지는 데 걸리는 시간 (CSS의 .splash transition과 같은 값)

function SplashScreen() {
  const [show, setShow] = useState(shouldShowSplash)
  const [leaving, setLeaving] = useState(false)
  const [startedAt] = useState(() => Date.now()) // 시작 시각 (눌렀을 때 최소 노출 시간을 계산)
  const timer = useRef(null)

  useEffect(() => {
    if (!show) return undefined
    timer.current = setTimeout(() => setLeaving(true), TOTAL_MS)
    return () => clearTimeout(timer.current)
  }, [show])

  // 사라지는 애니메이션이 끝나면 화면에서 뺀다
  useEffect(() => {
    if (!leaving) return undefined
    const done = setTimeout(() => setShow(false), FADE_MS)
    return () => clearTimeout(done)
  }, [leaving])

  // 화면을 누르면 바로 넘어간다 (단, 최소 노출 시간은 지킴)
  function handleTap() {
    clearTimeout(timer.current)
    const remain = Math.max(0, MIN_MS - (Date.now() - startedAt))
    timer.current = setTimeout(() => setLeaving(true), remain)
  }

  if (!show) return null

  return (
    <div className={`splash ${leaving ? 'out' : ''}`} role="img" aria-label="무럭무럭 시작 화면" onClick={handleTap}>
      <div className="splash-stage">
        {/* 사과 */}
        <svg className="splash-ic" style={{ '--d': '.5s', left: '10%', top: '19%' }} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 18c-6-5-18-2-18 12 0 12 8 22 14 22 2 0 3-1 4-1s2 1 4 1c6 0 14-10 14-22 0-14-12-17-18-12z" fill="#e0503a" />
          <path d="M32 18c0-5 2-9 6-11" stroke="#5b3a1e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M35 12c4-4 10-3 12 0-4 3-9 3-12 0z" fill="#6f9a3a" />
          <ellipse cx="22" cy="28" rx="3" ry="6" fill="#fff" opacity=".35" />
        </svg>
        {/* 튤립 */}
        <svg className="splash-ic" style={{ '--d': '.65s', left: 'calc(50% - 32px)', top: '11%' }} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 36v26" stroke="#5f9a3a" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 56c-8 0-12-6-12-12 6 0 12 4 12 12zM32 56c8 0 12-6 12-12-6 0-12 4-12 12z" fill="#6f9a3a" />
          <path d="M18 14c0 14 5 24 14 24s14-10 14-24l-7 5-7-9-7 9z" fill="#f2799a" />
          <path d="M32 10l-7 9M32 10l7 9" stroke="#d9567a" strokeWidth="2" />
        </svg>
        {/* 해바라기 */}
        <svg className="splash-ic" style={{ '--d': '.8s', right: '10%', top: '19%' }} viewBox="0 0 64 64" aria-hidden="true">
          <g fill="#f7c331" stroke="#d99a12" strokeWidth="1.5">
            <ellipse cx="32" cy="12" rx="6" ry="10" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(45 32 32)" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(90 32 32)" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(135 32 32)" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(180 32 32)" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(225 32 32)" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(270 32 32)" />
            <ellipse cx="32" cy="12" rx="6" ry="10" transform="rotate(315 32 32)" />
          </g>
          <circle cx="32" cy="32" r="10" fill="#7a4a1e" />
        </svg>
        {/* 토마토 */}
        <svg className="splash-ic" style={{ '--d': '.95s', left: '12%', top: '64%' }} viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="36" r="21" fill="#e8452c" />
          <g fill="#4f8a35">
            <ellipse cx="32" cy="17" rx="3.5" ry="8" />
            <ellipse cx="32" cy="17" rx="3.5" ry="8" transform="rotate(70 32 20)" />
            <ellipse cx="32" cy="17" rx="3.5" ry="8" transform="rotate(-70 32 20)" />
          </g>
          <ellipse cx="23" cy="30" rx="4" ry="6" fill="#fff" opacity=".3" />
        </svg>
        {/* 생선 */}
        <svg className="splash-ic" style={{ '--d': '1.1s', left: 'calc(50% - 32px)', top: '71%' }} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M48 32L62 20v24z" fill="#4a8fb8" />
          <ellipse cx="30" cy="32" rx="21" ry="12" fill="#6fb0d6" />
          <path d="M14 36c10 6 24 6 34-2-6 8-26 10-34 2z" fill="#cfe8f5" />
          <path d="M26 22c4-6 10-6 12-4" fill="none" stroke="#4a8fb8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="16" cy="29" r="2.5" fill="#1a2210" />
        </svg>
        {/* 당근 */}
        <svg className="splash-ic" style={{ '--d': '1.25s', right: '12%', top: '64%' }} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M20 22Q32 14 44 22Q42 36 32 60Q22 36 20 22Z" fill="#f08a24" />
          <path d="M25 32h7M34 42h6M28 46h5" stroke="#c96a10" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 20C29 11 25 9 22 4c6 1 11 6 10 16zM32 20c1-9 4-13 8-16 1 7-3 12-8 16zM32 20c-1-7 0-12 2-17 3 6 2 12-2 17z" fill="#5f9a3a" />
        </svg>

        <div className="splash-center">
          <div className="splash-logo">
            <i className="letters" />
            <i className="sprout" />
          </div>
          <div className="splash-tag">동네 가게 쿠폰을 한곳에서</div>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
