// 가짜 백엔드의 "규칙" 부분 — 데이터(db)를 받아서 바꾸기만 하는 함수들.
// api.js(화면이 부르는 함수)와 seed.js(처음 데이터 만들기)가 같이 쓴다.
// 그래서 시연 시작 데이터의 과거 기록도 실제 구매·사용과 똑같은 규칙으로 만들어진다.
//
// [확정 2026-11-03] 예치금·충전금 없음 (법률 문제로 폐지)
// - 가게는 돈을 미리 맡기지 않는다. 쿠폰이 실제로 쓰였을 때만 할인 부담이 생긴다
// - 가게는 "할인 한도(상한)"만 정한다 → 최대 발급 수 = 할인 한도 ÷ 할인 금액
// - 한도까지 발급되면 그 가게 쿠폰만 발급이 멈추고 기획전은 계속된다
//
// [기준] 쿠폰 정책표 2026-11-04 — 쿠폰 상태 6개
// LOCKED(잠김) → AVAILABLE(사용 가능) → PROCESSING(사용 처리 중) → USED(사용 완료)
//   - A 가게 결제: (없음) → LOCKED
//   - A 구매 확정: LOCKED → AVAILABLE / A 주문 취소·환불: LOCKED → VOIDED(소멸)
//   - B 가게 결제: AVAILABLE → PROCESSING
//   - B 구매 확정: PROCESSING → USED / B 주문 취소·환불: PROCESSING → AVAILABLE(복원)
//   - 유효기간 경과: AVAILABLE → EXPIRED(만료, 저장하지 않고 화면에 줄 때 계산 — api.js의 couponView)
// 주문 상태: PAID(결제됨) → CONFIRMED(구매 확정) / CANCELLED(취소·환불)

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
// type: ISSUE(발급) / CONFIRM(구매 확정) / APPLY(결제에 쿠폰 적용) / USE(사용 완료) / REFUND(취소·환불) / REJECT(거절) / ADMIN(관리: 심사·조건 등록·기획전 상태)
export function addLedger(db, at, type, detail, actor, extra = {}) {
  const entry = { id: newId('lg'), tx: newTx(), at, type, detail, actor, ...extra }
  db.ledger.push(entry)
  return entry
}

// 가게 조건 → 최대 발급 수 (할인 한도 ÷ 할인 금액)
export const qtyTotalOf = (term) => (term.value > 0 ? Math.floor(term.cap / term.value) : 0)

// 이 기획전에서 이 가게 쿠폰이 몇 장 발급·사용됐는지 (쿠폰 기록에서 바로 센다)
export function termStats(db, campaignId, merchantId) {
  // 소멸한 쿠폰은 쓰일 수 없으니 발급 수(한도 계산)에서 뺀다
  const mine = db.coupons.filter((c) => c.campaignId === campaignId && c.merchantId === merchantId && c.status !== 'VOIDED')
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

// 구매(모의 결제) → 다른 가게 쿠폰을 잠김 상태로 발급 (구매 확정 후에 쓸 수 있음)
// failFirst: 시연용 — 첫 쿠폰을 발급 오류로 처리 (결제는 그대로 완료)
export function doPurchase(db, userId, merchantId, at, { failFirst = false } = {}) {
  const product = db.products.find((p) => p.merchantId === merchantId)
  const order = { id: newId('o'), userId, merchantId, productName: product.name, amount: product.price, discount: 0, paid: product.price, couponId: null, status: 'PAID', at }
  db.orders.push(order)

  const { issue, missed } = couponsForPurchase(db, merchantId, at)
  if (failFirst && issue.length > 0) missed.unshift({ ...issue.shift(), reason: '발급 처리 중 문제가 생겼어요' })

  const issued = issue.map((x) => {
    const coupon = { ...x, id: newId('cp'), ownerId: userId, status: 'LOCKED', issuedAt: at, fromMerchantId: merchantId, orderId: order.id }
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
  COUPON_LOCKED: '구매 확정 후에 쓸 수 있는 쿠폰이에요.',
  COUPON_VOIDED: '주문이 취소돼 사라진 쿠폰이에요.',
}

// '아직 안 쓴 쿠폰인가'를 통과하지 못했을 때 상태별 실패 코드
// 사용 처리 중·사용 완료는 같은 쿠폰 재사용이라 같은 코드로 거절한다 (쿠폰 상태는 그대로)
const NOT_USABLE_CODE = { LOCKED: 'COUPON_LOCKED', VOIDED: 'COUPON_VOIDED', PROCESSING: 'COUPON_ALREADY_USED', USED: 'COUPON_ALREADY_USED' }

// 할인 금액 (정액권만 — [확정] 정률 없음). 주문 금액보다 클 수는 없다
export const calcDiscount = (coupon, amount) => Math.min(coupon.value, amount)

// B 가게 결제에 쿠폰 적용 — 5가지 확인 후 사용 처리 중으로. 거절도 기록에 남는다 (쿠폰 상태는 그대로)
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
    const code = failed.key === 'unused' ? NOT_USABLE_CODE[c.status] : failed.code
    const reason = code !== 'COUPON_ALREADY_USED' ? `${failed.label} 확인 실패` : c.status === 'PROCESSING' ? '처리 중 쿠폰 재사용 시도' : '이미 사용한 쿠폰 재사용 시도'
    addLedger(db, at, 'REJECT', `${c ? nameOf(db, c.merchantId) + ' 쿠폰' : '알 수 없는 쿠폰'} · ${reason}`, `소비자 ${maskUser(db, userId)}`, {
      merchantId,
      userId,
      couponId,
    })
    throw new ApiError(code, FAIL_MESSAGES[code], { checks: results, failedKey: failed.key, couponStatus: c?.status, usedAt: c?.usedAt ?? c?.appliedAt, merchantName: c ? nameOf(db, c.merchantId) : '' })
  }

  const discount = calcDiscount(c, product.price)
  const order = { id: newId('o'), userId, merchantId, productName: product.name, amount: product.price, discount, paid: product.price - discount, couponId: c.id, status: 'PAID', at }
  db.orders.push(order)
  c.status = 'PROCESSING'
  c.appliedAt = at
  c.discount = discount
  c.useOrderId = order.id // 구매 확정·환불 때 이 주문을 찾는다
  addLedger(db, at, 'APPLY', `${nameOf(db, merchantId)} 결제에 쿠폰 적용 · ${won(discount)}`, nameOf(db, merchantId), { merchantId, userId, couponId: c.id, discount, amount: product.price })
  return { order, coupon: c, checks: results }
}

// 내 주문이고 아직 결제 상태(확정·취소 전)인지 확인. 아니면 거절
function payableOrder(db, userId, orderId) {
  const order = db.orders.find((o) => o.id === orderId)
  if (!order || order.userId !== userId) throw new ApiError('ORDER_NOT_FOUND', '주문을 찾을 수 없어요.')
  return order
}

// 구매 확정 — A 주문이면 잠긴 쿠폰이 사용 가능으로, B 주문이면 처리 중 쿠폰이 사용 완료로
export function doConfirm(db, userId, orderId, at) {
  const order = payableOrder(db, userId, orderId)
  if (order.status !== 'PAID') throw new ApiError('ORDER_NOT_PAID', '이미 처리가 끝난 주문이에요.')
  order.status = 'CONFIRMED'
  order.confirmedAt = at
  const shop = nameOf(db, order.merchantId)

  const unlocked = db.coupons.filter((c) => c.orderId === order.id && c.status === 'LOCKED')
  unlocked.forEach((c) => {
    c.status = 'AVAILABLE'
  })
  if (unlocked.length > 0) {
    addLedger(db, at, 'CONFIRM', `${shop} 구매 확정 · 쿠폰 ${unlocked.length}장 사용 가능`, shop, { merchantId: order.merchantId, userId, couponIds: unlocked.map((c) => c.id) })
  }

  const applied = db.coupons.find((c) => c.id === order.couponId && c.status === 'PROCESSING')
  if (applied) {
    applied.status = 'USED'
    applied.usedAt = at
    // 사용 완료된 이때부터 가게의 할인 부담으로 잡힌다 (termStats, getBurden)
    addLedger(db, at, 'USE', `${shop} ${won(applied.discount)} · 결제 ${won(order.amount)}`, shop, { merchantId: order.merchantId, userId, couponId: applied.id, discount: applied.discount, amount: order.amount })
  }
  return { order, coupons: applied ? [applied] : unlocked }
}

// 주문 취소·환불 — A 주문이면 잠긴 쿠폰이 소멸, B 주문이면 처리 중 쿠폰이 복원
// [확정] 구매 확정 후 단순 변심 환불 불가 (상품 하자 환불 시 쿠폰 처리는 팀 협의 필요 — 정책표 4번 시트 No.4)
export function doCancel(db, userId, orderId, at) {
  const order = payableOrder(db, userId, orderId)
  if (order.status === 'CONFIRMED') throw new ApiError('ORDER_CONFIRMED', '구매 확정 후에는 단순 변심으로 환불할 수 없어요.')
  if (order.status !== 'PAID') throw new ApiError('ORDER_NOT_PAID', '이미 취소된 주문이에요.')
  order.status = 'CANCELLED'
  order.cancelledAt = at
  const shop = nameOf(db, order.merchantId)

  const voided = db.coupons.filter((c) => c.orderId === order.id && c.status === 'LOCKED')
  voided.forEach((c) => {
    c.status = 'VOIDED'
  })
  if (voided.length > 0) {
    addLedger(db, at, 'REFUND', `${shop} 주문 취소 · 쿠폰 ${voided.length}장 소멸`, shop, { merchantId: order.merchantId, userId, couponIds: voided.map((c) => c.id), voided: true })
  }

  const applied = db.coupons.find((c) => c.id === order.couponId && c.status === 'PROCESSING')
  if (applied) {
    applied.status = 'AVAILABLE' // 유효기간이 지났으면 화면에는 만료로 보인다 (api.js의 couponView)
    delete applied.appliedAt
    delete applied.discount
    delete applied.useOrderId
    const late = applied.expiresAt < dateOf(at)
    addLedger(db, at, 'REFUND', `${shop} 주문 취소·환불 · ${late ? '유효기간이 지나 쿠폰 만료' : '쿠폰 복원'}`, shop, { merchantId: order.merchantId, userId, couponId: applied.id })
  }
  return { order, coupons: applied ? [applied] : voided }
}
