// 블록체인 처리 단계 표시 (예: 지갑 서명 → 거래 전송 → 컨트랙트 검증 → 블록 확정)
// step: 지금 진행 중인 단계 번호 (steps.length 이상이면 모두 완료)
// failAt: 실패한 단계 번호 (없으면 -1)
function ChainProgress({ steps, step, failAt = -1 }) {
  return (
    <ol className="psteps">
      {steps.map((label, i) => {
        let state = ''
        if (failAt === i) state = 'fail'
        else if (failAt === -1 && i < step) state = 'done'
        else if (failAt !== -1 && i < failAt) state = 'done'
        else if (failAt === -1 && i === step) state = 'active'
        return (
          <li key={label} className={state}>
            <span className="dot">{state === 'done' ? '✓' : state === 'fail' ? '!' : i + 1}</span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

export default ChainProgress
