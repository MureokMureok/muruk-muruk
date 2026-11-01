// 결과·상태 화면 가운데 부분: 큰 동그라미 아이콘 + 제목 + 설명
// kind: 'ok'(완료 ✓) / 'bad'(거절 ✕) / 'warn'(실패 !) / 'wait'(확인 중 — 빙글빙글)
// 소비자에게는 블록체인 단계 대신 "확인 중"만 보여준다 (와이어프레임 v0 변경점)
function StatusView({ kind, title, desc }) {
  const icon = { ok: '✓', bad: '✕', warn: '!', wait: '' }[kind]
  return (
    <div className={`res ${kind} center-block`} role={kind === 'wait' ? 'status' : undefined}>
      <div className="big-ic">{kind === 'wait' ? <span className="spinner" aria-hidden="true" /> : icon}</div>
      <h2>{title}</h2>
      {desc && <p className="tiny">{desc}</p>}
    </div>
  )
}

export default StatusView
