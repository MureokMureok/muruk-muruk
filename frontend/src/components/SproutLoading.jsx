import { useEffect, useId, useState } from 'react'

// 로딩 캐릭터 "새싹이" (디자인 시안 "무럭무럭 로딩 캐릭터"에서 캐릭터 부분만 가져옴)
// - 처리에 시간이 걸리는 동안(결제, 구매 확정, 쿠폰 조건 등록…) 씨앗 → 새싹 → 꽃으로 자란다
// - 화면을 불러오는 동안에는 제자리에서 통통 뛴다
// - 금방 끝나면 깜빡이지 않도록, 300ms가 지나도 안 끝났을 때만 보이게 할 수 있다 (delay. 시안의 개발 참고)

const GROW_STEP_MS = 400 // 한 단계 자라는 간격
const GROW_LAST_STAGE = 4 // 1 씨앗 → 2·3 새싹 → 4 꽃

// 캐릭터 그림. stage: 'hop'(통통 뛰기) / 1 / 2 / 3 / 4
export function Sprout({ stage = 'hop' }) {
  const clipId = useId() // 화면에 여러 개 있어도 겹치지 않는 이름
  return (
    <svg className="sprout-svg" data-stage={stage} viewBox="0 0 160 170" aria-hidden="true">
      {/* 땅 밑으로 내려간 몸통은 잘라서 안 보이게 한다 */}
      <clipPath id={clipId}>
        <rect x="-40" y="-40" width="240" height="205" />
      </clipPath>
      <ellipse className="sprout-shadow" cx="80" cy="166" rx="58" ry="4" />
      <g clipPath={`url(#${clipId})`}>
        <g className="sprout-hop">
          <g className="sprout-body">
            <path className="sprout-leaf l1" d="M80 40 C60 18 36 22 32 38 C48 50 68 50 80 40Z" />
            <path className="sprout-leaf l2" d="M80 40 C100 18 124 22 128 38 C112 50 92 50 80 40Z" />
            <g className="sprout-flower">
              <circle cx="80" cy="28" r="7" fill="#ffb3c7" />
              <circle cx="70" cy="22" r="7" fill="#ffb3c7" />
              <circle cx="90" cy="22" r="7" fill="#ffb3c7" />
              <circle cx="73" cy="12" r="7" fill="#ffb3c7" />
              <circle cx="87" cy="12" r="7" fill="#ffb3c7" />
              <circle cx="80" cy="20" r="6" fill="#ffd84d" />
            </g>
            <ellipse className="sprout-skin" cx="80" cy="92" rx="44" ry="50" />
            <ellipse className="sprout-eye" cx="64" cy="86" rx="5" ry="6.5" />
            <ellipse className="sprout-eye" cx="96" cy="86" rx="5" ry="6.5" />
            <circle className="sprout-cheek" cx="52" cy="102" r="6" />
            <circle className="sprout-cheek" cx="108" cy="102" r="6" />
            <path className="sprout-mouth" d="M70 102 Q80 114 90 102" />
          </g>
        </g>
      </g>
      {/* 땅: 시안은 밑면이 평평하게 끝나서 자라기 전 몸통이 그 아래로 삐져나왔다 → 아래까지 흙으로 채움 */}
      <path className="sprout-soil" d="M26 154 Q80 116 134 154 L134 162 Q134 167 129 167 L31 167 Q26 167 26 162 Z" />
      <ellipse className="sprout-seed" cx="80" cy="136" rx="7" ry="5" />
    </svg>
  )
}

// 씨앗부터 꽃까지 시간이 지나면서 자라게 하는 도구
function useGrowth(on) {
  const [stage, setStage] = useState(1)
  useEffect(() => {
    if (!on) return undefined
    const t = setInterval(() => setStage((s) => Math.min(s + 1, GROW_LAST_STAGE)), GROW_STEP_MS)
    return () => clearInterval(t)
  }, [on])
  return on ? stage : 'hop'
}

// 화면 한가운데에 들어가는 로딩 (화면 내용을 불러오는 동안)
// - title: 큰 글자 / sub: 작은 글자 / growing: 씨앗→꽃으로 자람 (없으면 통통 뛰기)
// - delay: true면 300ms가 지나도 안 끝났을 때만 보임
export function SproutLoading({ title = '불러오고 있어요', sub = '잠시만 기다려 주세요', growing = false, delay = false }) {
  const stage = useGrowth(growing)
  return (
    <div className={`sprout-box ${delay ? 'delay' : ''}`} role="status" aria-live="polite">
      <Sprout stage={stage} />
      <b>{title}</b>
      {sub && <span>{sub}</span>}
    </div>
  )
}

// 화면 전체를 덮는 로딩 (버튼을 눌러 처리하는 동안. 처리 중에 다른 것을 누르지 못하게 막아 준다)
export function SproutOverlay(props) {
  return (
    <div className={`sprout-overlay ${props.delay ? 'delay' : ''}`}>
      <SproutLoading {...props} delay={false} />
    </div>
  )
}
