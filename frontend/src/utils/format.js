// 화면에 숫자·날짜를 보기 좋게 바꾸는 도구

// 35000 → "35,000원"
export const won = (n) => `${(n ?? 0).toLocaleString('ko-KR')}원`

// 35000 → "35,000" (단위 없이)
export const num = (n) => (n ?? 0).toLocaleString('ko-KR')

// "2026-12-14" → "12/14"
export const md = (dateText) => {
  if (!dateText) return ''
  const [, m, d] = dateText.slice(0, 10).split('-')
  return `${Number(m)}/${Number(d)}`
}

// "2026-11-01" → "11/01" (앞자리 0 유지)
export const mmdd = (t) => (t ? t.slice(5, 10).replace('-', '/') : '')

// "2026-11-03 18:20" → "11/03 18:20"
export const mdhm = (t) => (t ? `${mmdd(t)} ${t.slice(11, 16)}` : '')

// 기획전 기간 "11/1~11/30"
export const period = (c) => `${md(c.startDate)}~${md(c.endDate)}`

// 오늘부터 유효기간까지 남은 날 (D-30). 날짜끼리만 비교 (오늘 몇 시인지는 무시)
export function dDay(dateText) {
  const today = new Date(new Date().toLocaleString('sv-SE').slice(0, 10))
  return Math.max(0, Math.round((new Date(dateText.slice(0, 10)) - today) / 86400000))
}

// 기록 번호 줄여 보기: "0x9f3a…c23a" → "0x9f…3a"
export const shortTx = (tx) => (tx ? `${tx.slice(0, 4)}…${tx.slice(-2)}` : '')
