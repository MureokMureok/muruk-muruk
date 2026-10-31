// 가짜 백엔드 (모의 API).
// 화면은 이 파일의 함수만 부른다. 진짜 백엔드가 나오면 각 함수 안쪽을 fetch('/api/...') 호출로 바꾸면 된다.
// (함수 이름 옆 주석의 주소는 백엔드에 제안한 API 주소 — 백엔드_API_질문.md 참고)
//
// 데이터는 브라우저 localStorage에 저장한다. 그래서 KCP·가맹점·소비자로 번갈아 로그인해도
// 같은 데이터를 공유해 시연 장면이 이어진다. resetDemo()로 처음 상태로 되돌릴 수 있다.

import { createSeed } from './seed.js'

const DB_KEY = 'muruk.db'

// ---------- 내부 도구 ----------

// 실패를 알려줄 때 쓰는 에러. code로 어떤 실패인지 구분한다 (백엔드 에러 형식 제안과 같음)
export class ApiError extends Error {
  constructor(code, message, extra = {}) {
    super(message)
    this.code = code
    Object.assign(this, extra)
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY))
    if (saved) return saved
  } catch {
    // 저장된 값이 깨졌으면 처음 상태로
  }
  const seed = createSeed()
  save(seed)
  return seed
}

function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

// 네트워크·블록체인 처리 시간 흉내. 체인에 쓰는 작업은 길게(1.6초), 읽기는 짧게
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const READ_MS = 150
const CHAIN_MS = 1600

const today = () => new Date().toISOString().slice(0, 10)
const nowText = () => new Date().toLocaleString('sv-SE').slice(0, 16) // 2026-10-31 19:40 형태
const newId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const won = (n) => `${n.toLocaleString('ko-KR')}원`

// 체인 기록 한 줄 추가 (실제로는 블록체인에 이벤트가 남는 것)
function addLedger(db, type, label, detail, actor, extra = {}) {
  const last = db.ledger.reduce((m, l) => Math.max(m, l.block), 18204000)
  const entry = { block: last + 1, at: nowText(), type, label, detail, actor, ...extra }
  db.ledger.push(entry)
  return entry
}

const findMerchant = (db, id) => db.merchants.find((m) => m.id === id)
const remainingLimit = (m) => m.limit - m.reserved

// 할인 금액 계산: 정률이면 (금액 × %) 단 최대 할인액까지, 정액이면 그 금액
export function calcDiscount(coupon, amount) {
  if (coupon.discountType === 'RATE') {
    return Math.min(Math.floor((amount * coupon.value) / 100), coupon.maxDiscount)
  }
  return Math.min(coupon.value, amount)
}

// 쿠폰 혜택을 한 줄 글로: "10% 할인 · 최대 3,000원"
export function benefitText(c) {
  return c.discountType === 'RATE' ? `${c.value}% 할인 · 최대 ${won(c.maxDiscount)}` : `${won(c.value)} 할인`
}

// 화면에 보내기 전에 가맹점 정보를 붙여 준다
function withMerchant(db, obj) {
  const m = findMerchant(db, obj.merchantId)
  return { ...obj, merchantName: m.name, merchantShort: m.short, merchantColor: m.color, merchantCategory: m.category }
}

// ================= 소비자 =================

// GET /api/campaigns/current — 기획전과 참여 가게
export async function getCampaign() {
  await wait(READ_MS)
  const db = load()
  const c = db.campaign
  return {
    ...c,
    terms: c.terms.map((t) => ({
      ...withMerchant(db, t),
      // 남은 예산 비율 (쿠폰을 더 발급할 수 있는 여유)
      fundLeftRate: t.fund ? Math.max(0, (t.fund - t.fundReserved) / t.fund) : 0,
    })),
  }
}

// GET /api/merchants/{id}/product — 가게 상품 (시연용 1개)
export async function getProduct(merchantId) {
  await wait(READ_MS)
  const db = load()
  return withMerchant(db, db.products.find((p) => p.merchantId === merchantId))
}

// 이 가게에서 사면 받을 쿠폰 미리보기 (기획전 쿠폰 + 조건 충족 보너스)
function couponsForPurchase(db, userId, merchantId, amount) {
  const result = []
  const skipped = []
  const c = db.campaign

  // 1) 기획전 쿠폰: 구매한 가게를 뺀 나머지 참여 가게 쿠폰 (기획전이 진행 중일 때만)
  if (c.status === 'ACTIVE' && c.terms.some((t) => t.merchantId === merchantId)) {
    for (const t of c.terms) {
      if (t.merchantId === merchantId) continue
      // 충전금에서 최대 할인액을 미리 확보할 수 있어야 발급 (부족하면 그 가게 쿠폰만 빠짐)
      if (t.fund - t.fundReserved < t.maxDiscount) {
        skipped.push(findMerchant(db, t.merchantId).name)
        continue
      }
      result.push({
        source: 'CAMPAIGN',
        title: `${c.title}`,
        merchantId: t.merchantId,
        discountType: t.discountType,
        value: t.value,
        maxDiscount: t.maxDiscount,
        minOrder: t.minOrder,
        expiresAt: c.endDate,
      })
    }
  }

  // 2) 조건 충족 보너스: 구매한 가게가 직접 발행한 조건부 쿠폰
  const boughtBefore = db.orders.some((o) => o.userId === userId && o.merchantId === merchantId)
  for (const is of db.issuances) {
    if (is.merchantId !== merchantId || is.issuedCount >= is.qty) continue
    const ok =
      (is.receive === 'FIRST_PURCHASE' && !boughtBefore && amount >= is.receiveMin) ||
      (is.receive === 'MIN_AMOUNT' && amount >= is.receiveMin)
    if (!ok) continue
    result.push({
      source: 'ISSUANCE',
      issuanceId: is.id,
      title: is.name,
      merchantId: is.merchantId,
      discountType: is.discountType,
      value: is.value,
      maxDiscount: is.maxDiscount,
      minOrder: is.minOrder,
      expiresAt: is.expiresAt,
    })
  }
  return { coupons: result, skipped }
}

export async function previewPurchase(userId, merchantId) {
  await wait(READ_MS)
  const db = load()
  const product = db.products.find((p) => p.merchantId === merchantId)
  const { coupons, skipped } = couponsForPurchase(db, userId, merchantId, product.price)
  return { campaignStatus: db.campaign.status, coupons: coupons.map((x) => withMerchant(db, x)), skipped }
}

// POST /api/orders — 모의 결제 후 쿠폰 발급
export async function purchase(userId, merchantId) {
  await wait(CHAIN_MS)
  const db = load()
  const product = db.products.find((p) => p.merchantId === merchantId)
  const { coupons: toIssue, skipped } = couponsForPurchase(db, userId, merchantId, product.price)

  const order = {
    id: newId('o'),
    userId,
    merchantId,
    productName: product.name,
    amount: product.price,
    discount: 0,
    paid: product.price,
    couponId: null,
    at: nowText(),
  }
  db.orders.push(order)

  const issued = toIssue.map((x) => {
    // 발급할 때 예산을 미리 확보 (기획전: 해당 가게 충전금 / 보너스: 발행 수량)
    if (x.source === 'CAMPAIGN') {
      db.campaign.terms.find((t) => t.merchantId === x.merchantId).fundReserved += x.maxDiscount
    } else {
      db.issuances.find((is) => is.id === x.issuanceId).issuedCount += 1
    }
    const coupon = { ...x, id: newId('cp'), ownerId: userId, status: 'AVAILABLE', issuedAt: nowText(), fromMerchantId: merchantId }
    const log = addLedger(db, 'ISSUE', '쿠폰 발급', `${findMerchant(db, x.merchantId).name} 쿠폰 → 소비자 (${findMerchant(db, merchantId).name} 구매)`, '컨트랙트', { userId })
    coupon.issuedBlock = log.block
    db.coupons.push(coupon)
    return coupon
  })

  save(db)
  return { order, issuedCoupons: issued.map((c) => withMerchant(db, c)), skipped }
}

// GET /api/me/coupons
export async function getMyCoupons(userId) {
  await wait(READ_MS)
  const db = load()
  return db.coupons.filter((c) => c.ownerId === userId).reverse().map((c) => withMerchant(db, c))
}

// GET /api/coupons/{id}
export async function getCoupon(couponId) {
  await wait(READ_MS)
  const db = load()
  const c = db.coupons.find((x) => x.id === couponId)
  return c ? withMerchant(db, c) : null
}

// 쿠폰 사용 때 컨트랙트가 확인하는 항목 (순서대로)
export const USE_CHECKS = [
  { key: 'exists', label: '실제 발급된 쿠폰', code: 'COUPON_NOT_FOUND' },
  { key: 'owner', label: '내 쿠폰인가', code: 'NOT_OWNER' },
  { key: 'merchant', label: '사용 가능 가게', code: 'WRONG_MERCHANT' },
  { key: 'expiry', label: '유효기간', code: 'EXPIRED' },
  { key: 'unused', label: '미사용', code: 'COUPON_ALREADY_USED' },
]

const FAIL_MESSAGES = {
  COUPON_NOT_FOUND: '발급 기록이 없는 쿠폰이에요.',
  NOT_OWNER: '내 쿠폰이 아니에요.',
  WRONG_MERCHANT: '이 가게에서는 쓸 수 없는 쿠폰이에요.',
  EXPIRED: '유효기간이 지난 쿠폰이에요.',
  COUPON_ALREADY_USED: '이미 사용한 쿠폰이라 거절됐어요. 결제는 진행되지 않았어요.',
  MIN_ORDER_NOT_MET: '최소 주문 금액보다 적어요.',
}

// POST /api/orders (쿠폰 적용) — 컨트랙트 검증 후 사용 처리
// (이름을 useCoupon으로 하지 않은 이유: React는 use로 시작하는 함수를 특별한 함수(Hook)로 취급함)
export async function redeemCoupon(userId, couponId, merchantId) {
  await wait(CHAIN_MS)
  const db = load()
  const c = db.coupons.find((x) => x.id === couponId)
  const product = db.products.find((p) => p.merchantId === merchantId)

  // 검증 결과를 하나씩 계산 (화면에서 통과/실패 표시용)
  const results = {
    exists: !!c,
    owner: !!c && c.ownerId === userId,
    merchant: !!c && c.merchantId === merchantId,
    expiry: !!c && c.expiresAt >= today(),
    unused: !!c && c.status === 'AVAILABLE',
  }
  const failed = USE_CHECKS.find((ch) => !results[ch.key])
  if (failed) {
    addLedger(db, 'USE', '사용 거절', `${c ? findMerchant(db, c.merchantId).name + ' 쿠폰' : '알 수 없는 쿠폰'} · ${failed.label} 확인 실패`, '컨트랙트', { userId })
    save(db)
    throw new ApiError(failed.code, FAIL_MESSAGES[failed.code], { checks: results, failedKey: failed.key })
  }
  if (product.price < c.minOrder) {
    throw new ApiError('MIN_ORDER_NOT_MET', FAIL_MESSAGES.MIN_ORDER_NOT_MET, { checks: results })
  }

  const discount = calcDiscount(c, product.price)
  c.status = 'USED'
  c.usedAt = nowText()
  const log = addLedger(db, 'USE', '쿠폰 사용', `${findMerchant(db, merchantId).name} · 할인 ${won(discount)}`, '컨트랙트', { userId })
  c.usedBlock = log.block

  // 할인 비용 부담: 사용처 가게 (기획전 쿠폰은 충전금, 직접 발행 쿠폰은 발행분에서)
  if (c.source === 'CAMPAIGN') {
    db.campaign.terms.find((t) => t.merchantId === merchantId).fundUsed += discount
  } else {
    const is = db.issuances.find((x) => x.id === c.issuanceId)
    if (is) {
      is.usedCount += 1
      is.usedAmount += discount
    }
  }

  const order = {
    id: newId('o'),
    userId,
    merchantId,
    productName: product.name,
    amount: product.price,
    discount,
    paid: product.price - discount,
    couponId: c.id,
    couponSource: c.source,
    couponTitle: c.title,
    at: nowText(),
  }
  db.orders.push(order)
  save(db)
  return { order, coupon: withMerchant(db, c), checks: results }
}

// 내 활동 기록 (MY 화면)
export async function getMyActivity(userId) {
  await wait(READ_MS)
  const db = load()
  return db.ledger.filter((l) => l.userId === userId).reverse()
}

// ================= 가맹점 =================

// GET /api/stores/{id}/dashboard
export async function getStoreDashboard(merchantId) {
  await wait(READ_MS)
  const db = load()
  const m = findMerchant(db, merchantId)
  const term = db.campaign.terms.find((t) => t.merchantId === merchantId)
  return {
    merchant: { ...m, remaining: remainingLimit(m) },
    issuances: db.issuances.filter((is) => is.merchantId === merchantId).reverse(),
    campaignTerm: term || null,
    campaignStatus: db.campaign.status,
    campaignTitle: db.campaign.title,
    recentLedger: db.ledger.filter((l) => l.detail.includes(m.name) || l.actor === m.name).slice(-5).reverse(),
  }
}

// POST /api/stores/{id}/issuances — 조건부 쿠폰 발행 (한도 안에서만)
export async function createIssuance(merchantId, form) {
  await wait(CHAIN_MS)
  const db = load()
  const m = findMerchant(db, merchantId)
  const total = form.maxDiscount * form.qty
  if (m.limit === 0) throw new ApiError('NO_LIMIT', '아직 발행 한도가 없어요. KCP 입금 확인·한도 등록이 필요해요.')
  if (total > remainingLimit(m)) throw new ApiError('LIMIT_EXCEEDED', '남은 발행 한도를 초과했어요.')

  const expiresAt = new Date(Date.now() + form.expiryDays * 86400000).toISOString().slice(0, 10)
  const issuance = { ...form, id: newId('is'), merchantId, expiresAt, issuedCount: 0, usedCount: 0, usedAmount: 0, total, createdAt: nowText() }
  db.issuances.push(issuance)
  m.reserved += total
  addLedger(db, 'ISSUE', '쿠폰 발행', `${m.name} · ${form.name} ${form.qty}장 · 총 ${won(total)}`, m.name)
  save(db)
  return issuance
}

// POST /api/campaigns/{id}/sign — 기획전 조건 서명 (충전금을 한도에서 확보)
export async function signCampaign(merchantId, terms) {
  await wait(CHAIN_MS)
  const db = load()
  const m = findMerchant(db, merchantId)
  const c = db.campaign
  const t = c.terms.find((x) => x.merchantId === merchantId)
  if (c.status !== 'SIGNING') throw new ApiError('LOCKED', '규칙이 이미 잠겨 바꿀 수 없어요.')
  if (t.signed) throw new ApiError('ALREADY_SIGNED', '이미 서명했어요.')
  if (terms.fund > remainingLimit(m)) {
    throw new ApiError('LIMIT_EXCEEDED', `충전금이 남은 발행 한도(${won(remainingLimit(m))})보다 커요. KCP 한도 등록이 필요해요.`)
  }
  Object.assign(t, terms, { signed: true })
  m.reserved += terms.fund
  addLedger(db, 'ADMIN', '기획전 조건 서명', `${m.name} · ${benefitText(t)} · 충전금 ${won(t.fund)}`, m.name)

  // 모두 서명하면 규칙 잠금 → KCP 승인 대기
  if (c.terms.every((x) => x.signed)) {
    c.status = 'PENDING_APPROVAL'
    addLedger(db, 'ADMIN', '규칙 잠금', `${c.title} · 참여 가게 ${c.terms.length}곳 서명 완료`, '컨트랙트')
  }
  save(db)
  return { status: c.status }
}

// GET /api/stores/{id}/settlement — 정산 (사용된 할인액만)
export async function getSettlement(merchantId) {
  await wait(READ_MS)
  const db = load()
  const term = db.campaign.terms.find((t) => t.merchantId === merchantId)
  const rows = db.orders
    .filter((o) => o.merchantId === merchantId && o.couponId)
    .reverse()
    .map((o) => ({ ...o, customer: '지*' }))
  const issuanceUsed = db.issuances.filter((is) => is.merchantId === merchantId).reduce((s, is) => s + is.usedAmount, 0)
  return {
    campaignBurden: term ? term.fundUsed : 0,
    campaignRefund: term ? term.fund - term.fundUsed : 0,
    issuanceUsed,
    rows,
  }
}

// ================= KCP 관리자 =================

export async function getMerchants() {
  await wait(READ_MS)
  return load().merchants.map((m) => ({ ...m, remaining: remainingLimit(m) }))
}

// POST /api/admin/merchants/{id}/whitelist — 가맹점 확인 후 지갑 화이트리스트 등록
export async function whitelistMerchant(merchantId) {
  await wait(CHAIN_MS)
  const db = load()
  const m = findMerchant(db, merchantId)
  m.status = 'WHITELISTED'
  addLedger(db, 'ADMIN', '가맹점 등록', `${m.name} 지갑 화이트리스트 등록`, 'KCP')
  save(db)
}

export async function getDeposits() {
  await wait(READ_MS)
  const db = load()
  return db.deposits.map((d) => withMerchant(db, d)).reverse()
}

// POST /api/admin/deposits/{id}/limit — 입금 확인된 금액만큼 발행 한도 등록
export async function registerLimit(depositId) {
  await wait(CHAIN_MS)
  const db = load()
  const d = db.deposits.find((x) => x.id === depositId)
  const m = findMerchant(db, d.merchantId)
  if (m.status !== 'WHITELISTED') throw new ApiError('NOT_WHITELISTED', '화이트리스트 등록 전인 가맹점이에요.')
  d.status = 'REGISTERED'
  m.limit += d.amount
  addLedger(db, 'ADMIN', '한도 등록', `${m.name} · 입금 ${won(d.amount)} 확인 → 한도 ${won(m.limit)}`, 'KCP')
  save(db)
}

// POST /api/admin/campaigns/{id}/approve | reject — KCP는 승인·반려만 (규칙은 못 바꿈)
export async function decideCampaign(approve) {
  await wait(CHAIN_MS)
  const db = load()
  const c = db.campaign
  if (c.status !== 'PENDING_APPROVAL') throw new ApiError('NOT_PENDING', '승인 대기 상태가 아니에요.')
  c.status = approve ? 'ACTIVE' : 'REJECTED'
  addLedger(db, 'ADMIN', approve ? '기획전 승인' : '기획전 반려', c.title, 'KCP')
  save(db)
  return { status: c.status }
}

export async function getAdminCampaign() {
  await wait(READ_MS)
  const db = load()
  const c = db.campaign
  return {
    ...c,
    terms: c.terms.map((t) => ({ ...withMerchant(db, t), whitelisted: findMerchant(db, t.merchantId).status === 'WHITELISTED' })),
  }
}

// GET /api/admin/ledger — 체인 기록 전체
export async function getLedger() {
  await wait(READ_MS)
  return [...load().ledger].reverse()
}

// 시연 처음부터 다시 (리허설용)
export async function resetDemo() {
  save(createSeed())
}
