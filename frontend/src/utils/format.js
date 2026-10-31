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

// 블록 번호 18204001 → "#18,204,001"
export const blockNo = (n) => `#${num(n)}`
