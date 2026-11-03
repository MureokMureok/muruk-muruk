// 효과음 — 소리 파일 없이 브라우저가 직접 소리를 만들어 낸다 (Web Audio API)
// 사용: playSound('issue') / playSound('pay') / playSound('fail')
// public/sounds/issue.mp3 같은 파일이 있으면 그 소리를, 없으면 아래 합성음을 낸다
// - issue: 쿠폰 발급 성공 (밝게 올라가는 3음)
// - pay:   결제·쿠폰 사용 성공 ("띵동" 2음)
// - fail:  발급 실패·결제 실패·사용 거절 (낮게 내려가는 2음)
//
// C++로 치면 "소리 파형을 코드로 직접 합성"하는 것. 음 하나 = 진동수(Hz) + 길이 + 파형 모양

// 음 높이 (Hz)
const NOTE = { C5: 523, E5: 659, G5: 784, C6: 1047, E6: 1319, G6: 1568, A4: 440, E4: 330, A3: 220 }

// 소리별 음 목록: [음 높이, 시작 시각(초), 길이(초)]
const SOUNDS = {
  issue: { wave: 'triangle', volume: 0.18, notes: [[NOTE.C6, 0, 0.14], [NOTE.E6, 0.09, 0.14], [NOTE.G6, 0.18, 0.28]] },
  pay: { wave: 'sine', volume: 0.22, notes: [[NOTE.G5, 0, 0.18], [NOTE.C6, 0.16, 0.36]] },
  fail: { wave: 'square', volume: 0.07, notes: [[NOTE.E4, 0, 0.16], [NOTE.A3, 0.15, 0.3]] },
}

let ctx = null // 소리 장치 (처음 쓸 때 한 번만 만든다)

// 소리 파일로 바꿔 끼우기: frontend/public/sounds/<종류>.mp3 파일이 있으면 그 파일을 재생
// (예: public/sounds/issue.mp3) — 없으면 아래 합성음을 낸다.
// ※ 라이선스가 불분명한 소리 파일은 팀 저장소에 올리지 말 것 (내 PC에서만 쓰려면 .git/info/exclude에 등록)
export function playSound(type) {
  if (!SOUNDS[type]) return
  const audio = new Audio(`/sounds/${type}.mp3`)
  audio.volume = 0.8
  // 파일이 없거나 재생 못 하면 합성음으로 대신
  audio.play().catch(() => playSynth(type))
}

// 합성음 재생 (소리 파일이 없을 때)
function playSynth(type) {
  const sound = SOUNDS[type]
  try {
    // 브라우저 정책상 사용자가 화면을 한 번이라도 누른 뒤에만 소리가 난다 (결제 버튼 클릭 등)
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const start = ctx.currentTime
    for (const [freq, at, len] of sound.notes) {
      const osc = ctx.createOscillator() // 소리를 만드는 발진기
      const gain = ctx.createGain() // 볼륨 조절기
      osc.type = sound.wave
      osc.frequency.value = freq
      // 볼륨: 짧게 커졌다가 부드럽게 작아지게 (딱 끊기는 잡음 방지)
      gain.gain.setValueAtTime(0, start + at)
      gain.gain.linearRampToValueAtTime(sound.volume, start + at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + len)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start + at)
      osc.stop(start + at + len + 0.02)
    }
  } catch {
    // 소리를 못 내는 환경이면 조용히 넘어감 (화면 동작에는 영향 없음)
  }
}
