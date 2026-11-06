import { useEffect } from 'react'
import { playSound } from '../utils/sound.js'
import Icon from './Icon.jsx'

// 상태 화면 템플릿 (가이드 10): 아이콘 → 제목 → 설명 → (선택 정보 children) — 버튼은 화면 아래 고정 영역
// kind: 'ok'(완료 ✓ 연두) / 'wait'(확인 중 … 노랑) / 'bad'(거절 ✕ 빨강) / 'warn'(실패 ! 빨강) / 'empty'·'offline'·'search'(회색)
// strong: 설명을 굵게 (발급 완료 "쿠폰 2장을 받았어요")
// top: 화면 위쪽에 붙여서 (아래에 쿠폰 카드 등이 이어지는 결과 화면)
// sound: 화면이 나타날 때 낼 효과음 ('issue' / 'pay' / 'fail', 없으면 무음) — utils/sound.js
//
// 아이콘 애니메이션: 동그라미가 톡 튀어나온 뒤, ✓·✕·! 선이 붓으로 그리듯 그려진다 (styles/app.css)
// 확인 중에는 점 3개가 하나씩 늘어나는 애니메이션 (. → .. → ...)
function StatusView({ kind, title, desc, strong, top, sound, children }) {
  // 처음 나타날 때 한 번만 소리
  useEffect(() => {
    if (sound) playSound(sound)
  }, [sound])

  const tone = { ok: 'ok', wait: 'wait', bad: 'bad', warn: 'bad' }[kind] ?? ''
  return (
    <div className={`stb ${top ? 'top' : ''}`} role={{ wait: 'status', bad: 'alert', warn: 'alert', offline: 'alert' }[kind]}>
      <div className={`ic ${tone}`}>
        {kind === 'wait' && <WaitDots />}
        {(kind === 'ok' || kind === 'bad' || kind === 'warn') && <ResultMark kind={kind} />}
        {kind === 'empty' && <Icon name="ticket" size={32} />}
        {kind === 'offline' && <Icon name="wifi" size={32} />}
        {kind === 'search' && <Icon name="search" size={32} />}
      </div>
      <h2>{title}</h2>
      {desc && <p className={strong ? 'strong' : ''}>{desc}</p>}
      {children && <div className="box">{children}</div>}
    </div>
  )
}

// 확인 중 점 3개: . → .. → ... 처럼 하나씩 늘어났다가 다시 처음부터 (styles/app.css의 wait-dot)
function WaitDots() {
  return (
    <span className="dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

// ✓ / ✕ / ! 을 선으로 그린 그림. 선마다 'draw' 클래스 → 그려지는 애니메이션
function ResultMark({ kind }) {
  return (
    <svg className="mark" viewBox="0 0 52 52" aria-hidden="true">
      {kind === 'ok' && <path className="draw" pathLength="1" d="M15 27 L23 35 L38 18" />}
      {kind === 'bad' && (
        <>
          <path className="draw" pathLength="1" d="M17 17 L35 35" />
          <path className="draw d2" pathLength="1" d="M35 17 L17 35" />
        </>
      )}
      {kind === 'warn' && (
        <>
          <path className="draw" pathLength="1" d="M26 14 L26 30" />
          <path className="draw d2" pathLength="1" d="M26 37 L26 38" />
        </>
      )}
    </svg>
  )
}

export default StatusView
