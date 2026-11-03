import Icon from './Icon.jsx'

// 기록 타임라인 (가이드 11) — 시간 순서대로 위→아래
// items: [{ key, tone: 'ok'(✓ 연두) | 'x'(! 빨강) | 'w'(… 확인 중) | 'n'(아직, 빈 점), title, sub }]
function Timeline({ items }) {
  return (
    <ul className="tl">
      {items.map((it) => (
        <li key={it.key}>
          <span className={`dot ${it.tone === 'ok' ? '' : it.tone}`}>
            {it.tone === 'ok' && <Icon name="check" size={13} />}
            {it.tone === 'x' && <Icon name="alert" size={13} />}
            {it.tone === 'w' && '…'}
          </span>
          <div>
            <b className={it.tone === 'n' ? 'off' : ''}>{it.title}</b>
            {it.sub && <small>{it.sub}</small>}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default Timeline
