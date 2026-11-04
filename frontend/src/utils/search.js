// 검색 도구 — 쇼핑 앱들(네이버쇼핑·PAYCO 등)이 흔히 쓰는 방식
// 1) 띄어쓰기·대소문자·가운뎃점 무시: "꽃 다발" = "꽃다발", "꽃식물" = "꽃·식물"
// 2) 초성 검색: "ㄱㄱ"로 "감귤"을 찾음
// 3) 찾은 글자 강조: 결과·자동완성에서 일치한 부분만 진하게

// 한글 첫소리(초성) 19개. 한글 한 글자 = 0xAC00부터 (초성 × 588 + 중성 × 28 + 종성) 순서로 번호가 매겨져 있다
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

// "감귤" → "ㄱㄱ" (한글이 아닌 글자는 그대로). 글자 수가 그대로라 강조 위치를 같이 쓸 수 있다
export function toChosung(text) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00
      return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch
    })
    .join('')
}

const onlyChosung = (q) => /^[ㄱ-ㅎ]+$/.test(q)

// 비교용으로 다듬기: 소문자 + 띄어쓰기·가운뎃점·쉼표 빼기
export const normalize = (s) => s.toLowerCase().replace(/[\s·,]/g, '')

// text 안에 검색어 q가 들어 있는지 (초성만 쳤으면 초성끼리 비교)
export function matches(text, q) {
  const n = normalize(q)
  if (!n) return false
  const t = normalize(text)
  return onlyChosung(n) ? toChosung(t).includes(n) : t.includes(n)
}

// 강조할 부분 나누기: highlight("제주 제철 감귤", "감귤") → [{ text: '제주 제철 ', hit: false }, { text: '감귤', hit: true }]
// 띄어쓰기를 무시하고 찾기 때문에, 글자 위치를 띄어쓰기 뺀 글자 기준으로 맞춘다
export function highlight(text, q) {
  const n = normalize(q)
  if (!n) return [{ text, hit: false }]
  // 띄어쓰기 등을 뺀 글자들이 원래 문장의 몇 번째 글자였는지 기억
  const chars = [...text]
  const kept = []
  chars.forEach((ch, i) => {
    if (!/[\s·,]/.test(ch)) kept.push(i)
  })
  const flat = kept.map((i) => chars[i].toLowerCase()).join('')
  const at = (onlyChosung(n) ? toChosung(flat) : flat).indexOf(n)
  if (at < 0) return [{ text, hit: false }]
  const from = kept[at]
  const to = kept[at + n.length - 1] + 1
  return [
    { text: chars.slice(0, from).join(''), hit: false },
    { text: chars.slice(from, to).join(''), hit: true },
    { text: chars.slice(to).join(''), hit: false },
  ].filter((p) => p.text)
}

// ---------- 기획전 목록(GET /api/campaigns)에서 검색하기 ----------
// 검색 전용 API는 없다: 받아 온 목록을 상품 한 줄씩으로 펴서 프론트에서 거른다
// 백엔드 응답의 필드 이름이 다르면 toSearchRows 안쪽만 고치면 된다

// 기획전 목록 → 검색 결과 줄 (같은 상품이 기획전 두 개에 있으면 한 줄로 합침). 끝난 기획전은 뺀다
export function toSearchRows(campaigns) {
  const rows = new Map()
  for (const c of campaigns) {
    if (c.status === 'ENDED') continue
    for (const t of c.terms) {
      if (!t.product) continue
      const key = `${t.merchantId}/${t.product.name}`
      if (!rows.has(key)) {
        rows.set(key, { key, merchantId: t.merchantId, merchantName: t.merchantName, merchantCategory: t.merchantCategory, name: t.product.name, price: t.product.price, campaigns: [], coupons: 0, couponTotal: 0 })
      }
      const row = rows.get(key)
      row.campaigns.push({ id: c.id, title: c.title, status: c.status })
      // 진행 중인 기획전에서만: 이 상품을 사면 받는 다른 가게 쿠폰 (등록됐고 남아 있는 것)
      if (c.status === 'ACTIVE') {
        const others = c.terms.filter((x) => x.merchantId !== t.merchantId && x.registered && x.qtyLeft > 0)
        row.coupons += others.length
        row.couponTotal += others.reduce((s, x) => s + x.value, 0)
      }
    }
  }
  return [...rows.values()]
}

// 검색 대상 글자: 상품명 · 참여 가게 이름 · 기획전 이름
const fieldsOf = (row) => [row.name, row.merchantName, ...row.campaigns.map((c) => c.title)]

// 여러 단어로 검색하면 모든 단어가 들어간 줄만 (예: "제주 감귤")
export function filterRows(rows, q) {
  const words = q.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return rows.filter((row) => words.every((w) => fieldsOf(row).some((f) => matches(f, w))))
}

// 자동완성 후보: 위 세 가지 이름을 중복 없이
export const suggestionsOf = (rows) => [...new Set(rows.flatMap(fieldsOf))]

// ---------- 최근 검색어 (이 기기에만 저장 — 쇼핑 앱들과 같이 로그인과 상관없이 기기별) ----------
const RECENT_KEY = 'muruk.recentSearches'
const AUTOSAVE_KEY = 'muruk.recentAutosave'
const MAX_RECENT = 10

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 못 하는 환경이면 이번 화면에서만 씀
  }
}

export const getRecent = () => read(RECENT_KEY, [])
export const getAutosave = () => read(AUTOSAVE_KEY, true)
export const setAutosave = (on) => write(AUTOSAVE_KEY, on)

// 방금 검색한 말을 맨 앞에 (같은 말이 있으면 앞으로 옮김, 10개까지)
export function addRecent(term) {
  if (!getAutosave()) return getRecent()
  const next = [term, ...getRecent().filter((x) => x !== term)].slice(0, MAX_RECENT)
  write(RECENT_KEY, next)
  return next
}
export function removeRecent(term) {
  const next = getRecent().filter((x) => x !== term)
  write(RECENT_KEY, next)
  return next
}
export function clearRecent() {
  write(RECENT_KEY, [])
  return []
}
