import { useEffect } from 'react'
import { playSound } from '../utils/sound.js'

// 결과·상태 화면 가운데 부분: 큰 동그라미 아이콘 + 제목 + 설명
// kind: 'ok'(완료 ✓) / 'bad'(거절 ✕) / 'warn'(실패 !) / 'wait'(확인 중 — 빙글빙글)
// sound: 화면이 나타날 때 낼 효과음 ('issue' / 'pay' / 'fail', 없으면 무음) — utils/sound.js
// 소비자에게는 블록체인 단계 대신 "확인 중"만 보여준다 (와이어프레임 v0 변경점)
//
// 아이콘 애니메이션: 동그라미가 톡 튀어나온 뒤, ✓·✕·! 선이 붓으로 그리듯 그려진다 (styles/app.css)
function StatusView({ kind, title, desc, sound }) {
  // 처음 나타날 때 한 번만 소리
  useEffect(() => {
    if (sound) playSound(sound)
  }, [sound])

  return (
    <div className={`res ${kind} center-block`} role={kind === 'wait' ? 'status' : undefined}>
      <div className="big-ic">{kind === 'wait' ? <span className="spinner" aria-hidden="true" /> : <ResultMark kind={kind} />}</div>
      <h2>{title}</h2>
      {desc && <p className="tiny">{desc}</p>}
    </div>
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
