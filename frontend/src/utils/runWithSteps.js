// API 호출이 끝날 때까지 처리 단계(ChainProgress)를 하나씩 넘겨 보여주는 도구.
// 마지막 단계는 결과가 오면 완료 처리한다.
// 사용: await runWithSteps(() => purchase(...), STEPS.length, setStep)
// holdAt: 결과가 오기 전에는 이 단계에서 멈춰 기다린다 (예: '컨트랙트 검증' — 결과를 모르는데 통과한 것처럼 보이면 안 되므로)
export async function runWithSteps(task, stepCount, setStep, holdAt = stepCount - 1) {
  let i = 0
  setStep(0)
  const timer = setInterval(() => {
    if (i < holdAt) {
      i += 1
      setStep(i)
    }
  }, 400)
  try {
    const result = await task()
    setStep(stepCount)
    return result
  } finally {
    clearInterval(timer)
  }
}
