// 가짜 백엔드의 "규칙" 부분 — 데이터(db)를 받아서 바꾸기만 하는 함수들.
// api.js(화면이 부르는 함수)와 seed.js(처음 데이터 만들기)가 같이 쓴다.
// 그래서 시연 시작 데이터의 과거 기록도 실제 구매·사용과 똑같은 규칙으로 만들어진다.
//
// [확정 2026-11-03] 예치금·충전금 없음 (법률 문제로 폐지)
// - 가게는 돈을 미리 맡기지 않는다. 쿠폰이 실제로 쓰였을 때만 할인 부담이 생긴다
// - 가게는 "할인 한도(상한)"만 정한다 → 최대 발급 수 = 할인 한도 ÷ 할인 금액
// - 한도까지 발급되면 그 가게 쿠폰만 발급이 멈추고 기획전은 계속된다

// 실패를 알려줄 때 쓰는 에러. code로 어떤 실패인지 구분한다 (백엔드 에러 형식 제안과 같음)
export class ApiError extends Error {
  constructor(code, message, extra = {}) {
    super(message)
    this.code = code
    Object.assign(this, extra)
  }
}

export const won = (n) => `${(n ?? 0).toLocaleString('ko-KR')}원`
export const dateOf = (at) => at.slice(0, 10) // "2026-11-03 18:20" → "2026-11-03"
export const addDays = (dateText, n) => new Date(new Date(dateText).getTime() + n * 86400000).toISOString().slice(0, 10)
export const newId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// 기록 번호 (블록체인 거래 번호처럼 생긴 0x + 64자리 16진수). 화면에는 0x9f…3a처럼 줄여서 보여준다
function newTx() {
  let h = '0x'
  for (let i = 0; i < 64; i++) h += Math.floor(Math.random() * 16).toString(16)
  return h
}

export const findMerchant = (db, id) => db.merchants.find((m) => m.id === id)
export const findCampaign = (db, id) => db.campaigns.find((c) => c.id === id)
export const nameOf = (db, merchantId) => findMerchant(db, merchantId)?.name ?? ''

// 소비자 이름 가리기: "지민" → "지*" (가게·KCP 화면에 보여줄 때)
export const maskUser = (db, userId) => `${(db.users[userId] ?? '?')[0]}*`

// 기록 한 줄 추가 (실제로는 블록체인에 이벤트가 남는 것)
// type: ISSUE(발급) / USE(사용) / REJECT(거절) / ADMIN(관리: 심사·조건 등록·기획전 상태)
export function addLedger(db, at, type, detail, actor, extra = {}) {
  const entry = { id: newId('lg'), tx: newTx(), at, type, detail, actor, ...extra }
  db.ledger.push(entry)
  return entry
}

// 가게 조건 → 최대 발급 수 (할인 한도 ÷ 할인 금액)
export const qtyTotalOf = (term) => (term.value > 0 ? Math.floor(term.cap / term.value) : 0)

// 이 기획전에서 이 가게 쿠폰이 몇 장 발급·사용됐는지 (쿠폰 기록에서 바로 센다)
export function termStats(db, campaignId, merchantId) {
  const mine = db.coupons.filter((c) => c.campaignId === campaignId && c.merchantId === merchantId)
  const used = mine.filter((c) => c.status === 'USED')
  return {
    issued: mine.length,
    used: used.length,
    burden: used.reduce((s, c) => s + c.discount, 0), // 할인 부담 = 실제로 쓰인 할인액
  }
}

// 이 가게에서 사면 받을 쿠폰 (구매한 가게를 뺀 나머지 참여 가게, 기획전이 진행 중일 때만)
// - 한도까지 다 발급된 가게 쿠폰은 missed(사유: 소진)로 빠진다
export function couponsForPurchase(db, merchantId, at) {
  const issue = []
  const missed = []
  for (const c of db.campaigns) {
    if (c.status !== 'ACTIVE' || !c.terms.some((t) => t.merchantId === merchantId)) continue
    for (const t of c.terms) {
      if (t.merchantId === merchantId || !t.registered) continue
      const coupon = {
        campaignId: c.id,
        title: c.title,
        merchantId: t.merchantId,
        value: t.value,
        minOrder: t.minOrder,
        validity: t.validity,
        // 유효기간: 받은 날부터 30일 / 기획전 종료일까지
        expiresAt: t.validity === 'END' ? c.endDate : addDays(dateOf(at), 30),
      }
      if (termStats(db, c.id, t.merchantId).issued >= qtyTotalOf(t)) missed.push({ ...coupon, reason: '쿠폰이 모두 소진됐어요' })
      else issue.push(coupon)
    }
  }
  return { issue, missed }
}

// 구매(모의 결제) → 다른 가게 쿠폰 발급
// failFirst: 시연용 — 첫 쿠폰을 발급 오류로 처리 (결제는 그대로 완료)
export function doPurchase(db, userId, merchantId, at, { failFirst = false } = {}) {
  const product = db.products.find((p) => p.merchantId === merchantId)
  const order = { id: newId('o'), userId, merchantId, productName: product.name, amount: product.price, discount: 0, paid: product.price, couponId: null, at }
  db.orders.push(order)

  const { issue, missed } = couponsForPurchase(db, merchantId, at)
  if (failFirst && issue.length > 0) missed.unshift({ ...issue.shift(), reason: '발급 처리 중 문제가 생겼어요' })

  const issued = issue.map((x) => {
    const coupon = { ...x, id: newId('cp'), ownerId: userId, status: 'AVAILABLE', issuedAt: at, fromMerchantId: merchantId, orderId: order.id }
    db.coupons.push(coupon)
    return coupon
  })
  if (issued.length > 0) {
    addLedger(db, at, 'ISSUE', `${nameOf(db, merchantId)} 구매로 ${issued.map((c) => nameOf(db, c.merchantId)).join(', ')} 쿠폰 발급`, nameOf(db, merchantId), {
      merchantId,
      userId,
      couponIds: issued.map((c) => c.id),
    })
  }
  return { order, issued, missed }
}

// 쿠폰 사용 때 확인하는 5가지 (소비자에게 보이는 쉬운 말)
// 실제 발급된 쿠폰인지는 '내 쿠폰인가'에 함께 포함
export const USE_CHECKS = [
  { key: 'owner', label: '내 쿠폰인가', code: 'NOT_OWNER' },
  { key: 'merchant', label: '쓸 수 있는 가게인가', code: 'WRONG_MERCHANT' },
  { key: 'expiry', label: '유효기간 안인가', code: 'EXPIRED' },
  { key: 'minOrder', label: '최소 주문 금액', code: 'MIN_ORDER_NOT_MET' },
  { key: 'unused', label: '아직 안 쓴 쿠폰인가', code: 'COUPON_ALREADY_USED' },
]

const FAIL_MESSAGES = {
  NOT_OWNER: '내 쿠폰이 아니라 쓸 수 없어요.',
  WRONG_MERCHANT: '이 가게에서는 쓸 수 없는 쿠폰이에요.',
  EXPIRED: '유효기간이 지난 쿠폰이에요.',
  COUPON_ALREADY_USED: '이미 사용한 쿠폰이라 쓸 수 없어요.',
  MIN_ORDER_NOT_MET: '최소 주문 금액보다 적어 쓸 수 없어요.',
}

// 할인 금액 (정액권만 — [확정] 정률 없음). 주문 금액보다 클 수는 없다
export const calcDiscount = (coupon, amount) => Math.min(coupon.value, amount)

// 쿠폰 사용 — 5가지 확인 후 사용 처리. 거절도 기록에 남는다 (쿠폰 상태는 그대로)
export function doRedeem(db, userId, couponId, merchantId, at) {
  const c = db.coupons.find((x) => x.id === couponId)
  const product = db.products.find((p) => p.merchantId === merchantId)
  const results = {
    owner: !!c && c.ownerId === userId,
    merchant: !!c && c.merchantId === merchantId,
    expiry: !!c && c.expiresAt >= dateOf(at),
    minOrder: !!c && product.price >= c.minOrder,
    unused: !!c && c.status === 'AVAILABLE',
  }
  const failed = USE_CHECKS.find((ch) => !results[ch.key])
  if (failed) {
    addLedger(db, at, 'REJECT', `${c ? nameOf(db, c.merchantId) + ' 쿠폰' : '알 수 없는 쿠폰'} · ${failed.code === 'COUPON_ALREADY_USED' ? '이미 사용한 쿠폰 재사용 시도' : failed.label + ' 확인 실패'}`, `소비자 ${maskUser(db, userId)}`, {
      merchantId,
      userId,
      couponId,
    })
    throw new ApiError(failed.code, FAIL_MESSAGES[failed.code], { checks: results, failedKey: failed.key, usedAt: c?.usedAt, merchantName: c ? nameOf(db, c.merchantId) : '' })
  }

  const discount = calcDiscount(c, product.price)
  c.status = 'USED'
  c.usedAt = at
  c.discount = discount
  const order = { id: newId('o'), userId, merchantId, productName: product.name, amount: product.price, discount, paid: product.price - discount, couponId: c.id, at }
  db.orders.push(order)
  addLedger(db, at, 'USE', `${nameOf(db, merchantId)} ${won(discount)} · 결제 ${won(product.price)}`, nameOf(db, merchantId), {
    merchantId,
    userId,
    couponId: c.id,
    discount,
    amount: product.price,
  })
  return { order, coupon: c, checks: results }
}
