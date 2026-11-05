// 가짜 백엔드 (모의 API).
// 화면은 이 파일의 함수만 부른다. 진짜 백엔드가 나오면 각 함수 안쪽을 fetch('/api/...') 호출로 바꾸면 된다.
// (함수 이름 옆 주석의 주소는 백엔드에 제안할 API 주소)
//
// 데이터는 브라우저 localStorage에 저장한다. 그래서 KCP·가맹점·소비자로 번갈아 로그인해도
// 같은 데이터를 공유해 시연 장면이 이어진다. resetDemo()로 처음 상태로 되돌릴 수 있다.
// 규칙(발급·사용 검증 등)은 core.js에 있다.

import {
  ApiError,
  USE_CHECKS,
  addLedger,
  calcDiscount,
  couponsForPurchase,
  dateOf,
  doCancel,
  doClaim,
  doConfirm,
  doPublishPolicy,
  doPurchase,
  doRedeem,
  findCampaign,
  findMerchant,
  maskUser,
  nameOf,
  policyStats,
  qtyTotalOf,
  termStats,
  won,
} from './core.js'
import { SEED_VERSION, createSeed } from './seed.js'

export { ApiError, USE_CHECKS, calcDiscount }

const DB_KEY = 'muruk.db'

// ---------- 내부 도구 ----------

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY))
    // 저장된 데이터가 예전 버전이면 버리고 새 처음 상태로
    if (saved && saved.version === SEED_VERSION) return saved
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

// 네트워크·블록체인 처리 시간 흉내. 기록이 남는 작업은 길게(1.6초), 읽기는 짧게
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const READ_MS = 150
const CHAIN_MS = 1600

const today = () => new Date().toLocaleString('sv-SE').slice(0, 10)
const nowText = () => new Date().toLocaleString('sv-SE').slice(0, 16) // 2026-11-03 18:20 형태

// 화면에 보내기 전에 가맹점 정보를 붙여 준다
function withMerchant(db, obj) {
  const m = findMerchant(db, obj.merchantId)
  return { ...obj, merchantName: m.name, merchantShort: m.short, merchantColor: m.color, merchantCategory: m.category }
}

// 끝난 기획전이 목록 앞에 있어도 진행 중인 기획전이 가려지지 않게 상태 순서로 고른다
const STATUS_ORDER = ['ACTIVE', 'PAUSED', 'PREPARING', 'ENDED']
const pickCampaign = (campaigns) => [...campaigns].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))[0]
const mainCampaign = (db) => pickCampaign(db.campaigns)

// ---------- 시연용 실패·멈춤 (발표 질의응답용) ----------
// MY 화면에서 고르면 흉내 낸다. 연결 오류 말고는 한 번 일어나면 자동으로 정상으로 돌아옴
const SIM_KEY = 'muruk.simulate'
export const SIMULATIONS = [
  { value: '', label: '정상' },
  { value: 'ISSUE_FAIL', label: '다음 구매 때 쿠폰 1장 발급 실패' },
  { value: 'ISSUE_PENDING', label: '다음 구매 때 "발급 확인 중"에서 멈춤' },
  { value: 'PAY_FAIL', label: '다음 쿠폰 사용 때 결제 실패' },
  { value: 'USE_PENDING', label: '다음 쿠폰 사용 때 "사용 확인 중"에서 멈춤' },
  { value: 'NETWORK', label: '연결 오류 (다시 불러오기 누를 때까지)' },
]

export function getSimulation() {
  try {
    return localStorage.getItem(SIM_KEY) || ''
  } catch {
    return ''
  }
}

export function setSimulation(value) {
  try {
    if (value) localStorage.setItem(SIM_KEY, value)
    else localStorage.removeItem(SIM_KEY)
  } catch {
    // 저장 못 하면 시연 실패 없이 정상 동작
  }
}

// 이 시연이 예약돼 있으면 꺼내 쓰고(한 번만) true
function takeSim(kind) {
  if (getSimulation() !== kind) return false
  setSimulation('')
  return true
}

// 화면 데이터 읽기 전에 부름: 연결 오류 시연이면 실패
// 연결 오류는 "한 번만"이 아니라 '다시 불러오기'를 누를 때까지 계속된다
// (개발 모드에서 React가 화면을 두 번 불러서, 한 번만 실패하면 실패가 묻혀 버리기 때문)
function readGuard() {
  if (getSimulation() === 'NETWORK') throw new ApiError('NETWORK', '연결이 불안정해요. 잠시 후 다시 시도해 주세요.')
}

// ================= 계정 =================

// POST /api/auth/google — 구글 로그인 후 무럭무럭 계정이 있는지 확인. 있으면 계정, 없으면 null
export async function findAccount(email) {
  await wait(READ_MS)
  return load().accounts.find((a) => a.email === email) ?? null
}

function assertNewAccount(db, email) {
  if (db.accounts.some((a) => a.email === email)) throw new ApiError('ALREADY_JOINED', '이미 가입한 계정이에요. 다시 로그인해 주세요.')
}

// POST /api/auth/signup/consumer — 이용자 가입
export async function signUpConsumer({ id, name, email }) {
  await wait(READ_MS)
  const db = load()
  assertNewAccount(db, email)
  const account = { id, name: name.trim(), email, role: 'consumer' }
  db.accounts.push(account)
  db.users[id] = account.name
  save(db)
  return account
}

// 진짜 로그인 사용자도 쿠폰·주문은 아직 모의 데이터를 쓰므로, 가게 화면에 보일 이름을 넣어 둔다
export function ensureMockUser(id, name) {
  const db = load()
  if (db.users[id] === name) return
  db.users[id] = name
  save(db)
}

// 백엔드 업종 값 → 모의 데이터의 업종 글자
const CATEGORY_LABEL = { FLOWER_PLANT: '꽃·식물', FRUIT: '제철 과일', SEAFOOD: '수산·반찬', FARM_PRODUCE: '농산물', SIDE_DISH: '수산·반찬' }

// 새 가게 표시 색
const STORE_COLORS = ['#ffc091', '#ffd7ef', '#a0e1e1', '#ffe7a3', '#d5e8b5']

// POST /api/auth/signup/merchant — 가맹점 가입 = 참여 신청. KCP 심사(승인)까지는 가맹점 센터를 못 씀
export async function signUpMerchant({ id, email, storeName, category, bizNumber }) {
  await wait(CHAIN_MS)
  const db = load()
  assertNewAccount(db, email)
  const name = storeName.trim()
  if (db.merchants.some((m) => m.name === name)) throw new ApiError('DUPLICATE_STORE', '이미 등록된 가게 이름이에요.')
  const n = db.merchants.length + 1
  const merchantId = `m${n}`
  db.merchants.push({ id: merchantId, name, category: CATEGORY_LABEL[category], short: name[0], color: STORE_COLORS[n % STORE_COLORS.length], status: 'APPLIED', appliedAt: today(), bizNumber: bizNumber.replace(/\D/g, ''), bizChecked: false, channel: '미입력', kcpPay: false, scale: '소형' })
  db.products.push({ merchantId, name: `${name} 대표 상품`, price: 20000 }) // 백엔드에 상품이 없어 시연용 기본값
  const account = { id, name, email, role: 'store', merchantId }
  db.accounts.push(account)
  addLedger(db, nowText(), 'ADMIN', `${name} 가맹점 참여 신청`, name, { merchantId })
  save(db)
  return account
}

// ================= 소비자 =================

// 기획전 + 참여 가게 조건 (화면용)
function campaignView(db, c) {
  return {
    ...c,
    terms: c.terms.map((t) => {
      const s = termStats(db, c.id, t.merchantId)
      const qtyTotal = qtyTotalOf(t)
      return { ...withMerchant(db, t), ...s, qtyTotal, qtyLeft: Math.max(0, qtyTotal - s.issued) }
    }),
  }
}

// GET /api/campaigns/current — 소비자 화면의 기획전과 참여 가게
export async function getCampaign() {
  await wait(READ_MS)
  readGuard()
  const db = load()
  return campaignView(db, mainCampaign(db))
}

// GET /api/campaigns — 기획전 목록. 소비자 검색은 별도 API 없이 이 목록을 받아 프론트에서 거른다 (utils/search.js)
// [가정] 응답 모양은 백엔드 명세서와 아직 안 맞춰 봄: 참여 가게(terms)마다 상품(product)이 들어 있다고 가정
export async function getCampaigns() {
  await wait(READ_MS)
  readGuard()
  const db = load()
  return db.campaigns.map((c) => {
    const view = campaignView(db, c)
    return {
      ...view,
      terms: view.terms.map((t) => {
        const p = db.products.find((x) => x.merchantId === t.merchantId)
        return { ...t, product: { name: p.name, price: p.price } }
      }),
    }
  })
}

// GET /api/merchants/{id}/product — 가게 상품 (시연용 1개)
export async function getProduct(merchantId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  const product = db.products.find((p) => p.merchantId === merchantId)
  return product ? withMerchant(db, product) : null
}

// 이 가게에서 사면 받을 쿠폰 미리보기
export async function previewPurchase(merchantId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  const c = pickCampaign(db.campaigns.filter((x) => x.terms.some((t) => t.merchantId === merchantId))) ?? mainCampaign(db)
  // core.js의 발급 규칙을 그대로 쓰되, 저장은 하지 않는다
  const { issue, missed } = couponsForPurchase(db, merchantId, nowText())
  return {
    campaignStatus: c.status,
    coupons: issue.map((x) => withMerchant(db, x)),
    missed: missed.map((x) => withMerchant(db, x)),
  }
}

// POST /api/orders — 모의 결제 후 쿠폰 발급 (잠김 상태)
// 돌려주는 값: { order, issuedCoupons, missedCoupons(못 받은 쿠폰 + 사유), pending(발급 확인 중) }
export async function purchase(userId, merchantId) {
  await wait(CHAIN_MS)
  const db = load()
  const failFirst = takeSim('ISSUE_FAIL')
  const pending = takeSim('ISSUE_PENDING')
  const { order, issued, missed } = doPurchase(db, userId, merchantId, nowText(), { failFirst })
  save(db)
  return { order, issuedCoupons: issued.map((c) => couponView(db, c)), missedCoupons: missed.map((x) => withMerchant(db, x)), pending }
}

// 화면용 쿠폰 정보: 가게 정보 + 유효기간이 지난 '사용 가능' 쿠폰은 EXPIRED(만료)로 표시
// 만료 판정: 유효기간 마지막 날까지 사용 가능
function couponView(db, c) {
  const status = c.status === 'AVAILABLE' && c.expiresAt < today() ? 'EXPIRED' : c.status
  // issuedTogether: 같은 구매로 받은 쿠폰 수 (주문을 취소하면 함께 사라진다고 안내할 때 씀)
  return { ...withMerchant(db, c), status, fromMerchantName: nameOf(db, c.fromMerchantId), issuedTogether: c.orderId ? db.coupons.filter((x) => x.orderId === c.orderId).length : 1 }
}

// 지금 바로 쓸 수 있는 내 쿠폰
const usableCoupons = (db, userId) => db.coupons.filter((c) => c.ownerId === userId && c.status === 'AVAILABLE' && c.expiresAt >= today()).map((c) => couponView(db, c))

// GET /api/me/coupons
export async function getMyCoupons(userId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  return db.coupons.filter((c) => c.ownerId === userId).reverse().map((c) => couponView(db, c))
}

// GET /api/coupons/{id} — 모의 API라 userId로 주인을 확인한다. 실제 서버는 토큰으로 확인한다
export async function getCoupon(couponId, userId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  const c = db.coupons.find((x) => x.id === couponId && x.ownerId === userId)
  return c ? couponView(db, c) : null
}

// GET /api/coupons/{id}/history — 이 쿠폰의 발급·사용 기록
export async function getCouponHistory(couponId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  return db.ledger
    .filter((l) => l.couponId === couponId || l.couponIds?.includes(couponId))
    .map((l) => ({ ...l, merchantName: nameOf(db, l.merchantId) }))
}

// GET /api/me/summary — MY 화면 요약 (받은 쿠폰·사용한 쿠폰·아낀 금액)
export async function getMySummary(userId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  const mine = db.coupons.filter((c) => c.ownerId === userId && c.status !== 'VOIDED')
  return {
    received: mine.length,
    used: mine.filter((c) => c.status === 'USED').length,
    // 아낀 금액은 구매 확정된 주문만 (취소·환불한 주문의 할인은 아낀 게 아님)
    saved: db.orders.filter((o) => o.userId === userId && o.status === 'CONFIRMED').reduce((s, o) => s + o.discount, 0),
  }
}

// POST /api/orders (쿠폰 적용) — 5가지 확인 후 사용 처리 중으로 (구매 확정 전까지 사용 완료가 아님)
// (이름을 useCoupon으로 하지 않은 이유: React는 use로 시작하는 함수를 특별한 함수(Hook)로 취급함)
export async function redeemCoupon(userId, couponId, merchantId) {
  await wait(CHAIN_MS)
  // 시연용: 결제 승인 실패. 쿠폰은 쓰이지 않고 그대로 남는다 (결제 실패 시 쿠폰이 사라지면 안 됨)
  if (takeSim('PAY_FAIL')) throw new ApiError('PAYMENT_FAILED', '결제가 승인되지 않았어요.')
  const pending = takeSim('USE_PENDING')
  const db = load()
  try {
    const r = doRedeem(db, userId, couponId, merchantId, nowText())
    save(db)
    return { order: r.order, coupon: couponView(db, r.coupon), checks: r.checks, pending }
  } catch (err) {
    save(db) // 거절 기록은 남긴다
    throw err
  }
}

// GET /api/coupon-policies — 손님이 직접 받을 수 있는 일반 쿠폰. userId가 있으면 이미 받았는지도 알려 준다
export async function getCouponOffers(userId) {
  await wait(READ_MS)
  readGuard()
  const db = load()
  return db.couponPolicies
    .filter((p) => findMerchant(db, p.merchantId)?.status === 'APPROVED')
    .map((p) => {
      const mine = userId ? db.coupons.find((c) => c.policyId === p.id && c.ownerId === userId) : null
      return { ...withMerchant(db, p), ...policyStats(db, p), myCouponId: mine?.id ?? null }
    })
    .reverse()
}

// POST /api/coupon-policies/{id}/claim — 쿠폰 받기. 받으면 바로 사용 가능
export async function claimCoupon(userId, policyId) {
  await wait(CHAIN_MS)
  const db = load()
  const coupon = doClaim(db, userId, policyId, nowText())
  save(db)
  return couponView(db, coupon)
}

// [가정] POST /api/orders/{id}/confirm — 구매 확정 (백엔드 명세서에 아직 없음. 지금은 모의로만 동작)
// 돌려주는 값: { order, coupons(상태가 바뀐 쿠폰), leftCoupons(지금 쓸 수 있는 쿠폰) }
export async function confirmOrder(userId, orderId) {
  await wait(CHAIN_MS)
  const db = load()
  const r = doConfirm(db, userId, orderId, nowText())
  save(db)
  return { order: r.order, coupons: r.coupons.map((c) => couponView(db, c)), leftCoupons: usableCoupons(db, userId) }
}

// [가정] POST /api/orders/{id}/cancel — 주문 취소·환불 (백엔드 명세서에 아직 없음. 지금은 모의로만 동작)
export async function cancelOrder(userId, orderId) {
  await wait(CHAIN_MS)
  const db = load()
  const r = doCancel(db, userId, orderId, nowText())
  save(db)
  return { order: r.order, coupons: r.coupons.map((c) => couponView(db, c)) }
}

// ================= 가맹점 =================

// 가게 이름·업종 (콘솔 위쪽 계정 표시)
export async function getMerchant(merchantId) {
  await wait(READ_MS)
  return findMerchant(load(), merchantId)
}

// 이 가게가 참여한 기획전 + 가게 조건 + 숫자
function storeCampaigns(db, merchantId) {
  return db.campaigns.filter((c) => c.terms.some((t) => t.merchantId === merchantId)).map((c) => campaignView(db, c))
}

// 손님 연결: 보낸 손님(우리 가게 구매로 다른 가게 쿠폰 발급) / 온 손님(다른 가게 구매로 받은 쿠폰을 우리 가게에서 사용)
function customerLinks(db, merchantId) {
  // 취소된 주문·소멸한 쿠폰은 손님을 보낸 것으로 세지 않는다
  const sentOrders = db.orders.filter((o) => o.merchantId === merchantId && o.status !== 'CANCELLED' && db.coupons.some((c) => c.orderId === o.id))
  // 일반 쿠폰은 다른 가게에서 온 손님이 아니므로 뺀다
  const ourUsed = db.coupons.filter((c) => c.merchantId === merchantId && c.status === 'USED' && !c.policyId)
  const partners = [...new Set(db.coupons.filter((c) => !c.policyId && (c.fromMerchantId === merchantId || c.merchantId === merchantId)).flatMap((c) => [c.merchantId, c.fromMerchantId]))].filter((id) => id !== merchantId)
  return {
    sent: new Set(sentOrders.map((o) => o.userId)).size,
    received: new Set(ourUsed.map((c) => c.ownerId)).size,
    partners: partners.map((p) => ({
      merchantId: p,
      name: nameOf(db, p),
      sent: db.coupons.filter((c) => c.fromMerchantId === merchantId && c.merchantId === p && c.status !== 'VOIDED').length,
      received: ourUsed.filter((c) => c.fromMerchantId === p).length,
    })),
  }
}

// 이 가게와 관련된 기록 (우리 쿠폰 발급·사용·거절, 우리 조건 등록)
function storeLedger(db, merchantId) {
  const ourCoupon = (id) => db.coupons.find((c) => c.id === id)?.merchantId === merchantId
  return db.ledger
    .filter((l) => l.merchantId === merchantId || l.couponIds?.some(ourCoupon) || (l.couponId && ourCoupon(l.couponId)))
    .map((l) => ({ ...l, customer: l.userId ? maskUser(db, l.userId) : '' }))
    .reverse()
}

// GET /api/stores/{id}/dashboard
export async function getStoreDashboard(merchantId) {
  await wait(READ_MS)
  const db = load()
  const campaigns = storeCampaigns(db, merchantId)
  const active = campaigns.filter((c) => c.status === 'ACTIVE')
  const mine = (c) => c.terms.find((t) => t.merchantId === merchantId)
  const sum = (key) => active.reduce((s, c) => s + mine(c)[key], 0)
  return {
    merchant: findMerchant(db, merchantId),
    asOf: today(), // 기준 날짜 (화면 맨 위 "11월 3일 기준")
    activeCount: active.length,
    activeTitle: active[0]?.title ?? '',
    issued: sum('issued'),
    qtyTotal: sum('qtyTotal'),
    used: sum('used'),
    burden: sum('burden'),
    cap: sum('cap'),
    links: customerLinks(db, merchantId),
    recent: storeLedger(db, merchantId).slice(0, 4),
    campaigns: campaigns.map((c) => ({ ...c, mine: mine(c) })),
  }
}

// GET /api/stores/{id}/campaigns — 참여 기획전 현황 (목업 M3)
export async function getStoreCampaigns(merchantId) {
  await wait(READ_MS)
  const db = load()
  return storeCampaigns(db, merchantId).map((c) => ({
    ...c,
    // 조건 변경 이력: 이 기획전의 관리 기록
    history: db.ledger.filter((l) => l.type === 'ADMIN' && l.campaignId === c.id).reverse(),
  }))
}

// PUT /api/stores/{id}/campaigns/{cid}/terms — 우리 가게 쿠폰 조건 저장 (목업 M2)
// register: true면 "기획전에 등록하기"(기록에 남음), false면 "임시 저장"
// [가정] 진행 중·일시 중지·종료된 기획전의 조건은 바꿀 수 없다 (KCP가 바꿀 수 있는 범위와 함께 회의에서 정할 일)
export async function saveTerms(merchantId, campaignId, form, register) {
  await wait(register ? CHAIN_MS : READ_MS)
  const db = load()
  const c = findCampaign(db, campaignId)
  const t = c.terms.find((x) => x.merchantId === merchantId)
  if (c.status !== 'PREPARING') throw new ApiError('LOCKED', '기획전이 시작된 뒤에는 조건을 바꿀 수 없어요.')
  if (!(form.value > 0)) throw new ApiError('INVALID', '할인 금액을 입력해 주세요.')
  if (form.minOrder < form.value) throw new ApiError('INVALID', '최소 주문 금액은 할인 금액보다 작게 입력할 수 없어요.')
  if (form.cap < form.value) throw new ApiError('INVALID', '할인 한도는 할인 금액 이상이어야 해요.')
  // 등록된 조건은 손님 쿠폰에 바로 쓰이므로, 기록 없이 바뀌지 않게 다시 등록만 허용한다
  if (!register && t.registered) throw new ApiError('ALREADY_REGISTERED', '이미 등록한 조건은 임시 저장할 수 없어요. 바꾼 조건으로 다시 등록해 주세요.')

  Object.assign(t, { value: form.value, minOrder: form.minOrder, validity: form.validity, cap: form.cap })
  if (register) {
    t.registered = true
    addLedger(db, nowText(), 'ADMIN', `${nameOf(db, merchantId)} 쿠폰 조건 등록 · ${won(t.value)} · ${won(t.minOrder)} 이상`, nameOf(db, merchantId), { campaignId, merchantId })
  } else {
    t.draft = true
  }
  save(db)
  return campaignView(db, c)
}

// GET /api/merchants/me/coupon-policies — 우리 가게가 발행한 일반 쿠폰
export async function getStorePolicies(merchantId) {
  await wait(READ_MS)
  const db = load()
  return db.couponPolicies.filter((p) => p.merchantId === merchantId).map((p) => ({ ...p, ...policyStats(db, p) })).reverse()
}

// POST /api/merchants/me/coupon-policies — 일반 쿠폰 발행. 받는 방법은 직접 받기, 사용처는 우리 가게만 (백엔드 DIRECT·OWN_SHOP)
export async function publishPolicy(merchantId, form) {
  await wait(CHAIN_MS)
  const db = load()
  const policy = doPublishPolicy(db, merchantId, form, nowText())
  save(db)
  return policy
}

// GET /api/stores/{id}/burden — 할인 부담 내역 (목업 M4). 실제 정산(돈 이동)은 이번 범위 밖
export async function getBurden(merchantId) {
  await wait(READ_MS)
  const db = load()
  const used = db.coupons.filter((c) => c.merchantId === merchantId && c.status === 'USED')
  const rows = used
    .map((c) => {
      // 환불 후 다시 쓴 쿠폰은 주문이 여러 개일 수 있어 구매 확정된 주문을 찾는다
      const o = db.orders.find((x) => x.couponId === c.id && x.status === 'CONFIRMED')
      const log = db.ledger.find((l) => l.type === 'USE' && l.couponId === c.id)
      return { id: c.id, at: c.usedAt, customer: maskUser(db, c.ownerId), source: c.policyId ? '직접 받기' : `${nameOf(db, c.fromMerchantId)} 구매`, amount: o.amount, discount: c.discount, tx: log?.tx }
    })
    .sort((a, b) => b.at.localeCompare(a.at))
  // 새로 온 손님: 우리 가게 첫 주문이 쿠폰을 쓴 주문인 손님
  const newCustomers = new Set(
    used
      .filter((c) => {
        const first = db.orders.filter((o) => o.userId === c.ownerId && o.merchantId === merchantId && o.status !== 'CANCELLED').sort((a, b) => a.at.localeCompare(b.at))[0]
        return first?.couponId === c.id
      })
      .map((c) => c.ownerId),
  ).size
  return {
    burden: rows.reduce((s, r) => s + r.discount, 0),
    usedCount: rows.length,
    sales: rows.reduce((s, r) => s + r.amount, 0),
    newCustomers,
    rows,
  }
}

// ================= KCP 관리자 =================

// GET /api/admin/merchants — 가맹점 참여 신청·심사 (목업 K1)
export async function getMerchants() {
  await wait(READ_MS)
  return [...load().merchants].sort((a, b) => (a.status === 'APPLIED' ? 0 : 1) - (b.status === 'APPLIED' ? 0 : 1) || b.appliedAt.localeCompare(a.appliedAt))
}

// POST /api/admin/merchants/{id}/approve | reject
export async function reviewMerchant(merchantId, approve) {
  await wait(CHAIN_MS)
  const db = load()
  const m = findMerchant(db, merchantId)
  if (m.status !== 'APPLIED') throw new ApiError('NOT_PENDING', '심사 대기 중인 가게가 아니에요.')
  m.status = approve ? 'APPROVED' : 'REJECTED'
  addLedger(db, nowText(), 'ADMIN', `${m.name} 가맹점 ${approve ? '승인' : '반려'}`, 'KCP', { merchantId })
  save(db)
}

// 가게 간 손님 흐름: 보낸 가게(구매한 곳) → 받은 가게(쿠폰을 실제로 쓴 곳) 사용 수
function flowMatrix(db, c) {
  const ids = c.terms.map((t) => t.merchantId)
  return ids.map((from) => ({
    merchantId: from,
    name: nameOf(db, from),
    cells: ids.map((to) => (from === to ? null : db.coupons.filter((x) => x.campaignId === c.id && x.fromMerchantId === from && x.merchantId === to && x.status === 'USED').length)),
  }))
}

// GET /api/admin/campaigns — 연합 기획전 관리 (목업 K2)
export async function getAdminCampaigns() {
  await wait(READ_MS)
  const db = load()
  return db.campaigns.map((c) => ({ ...campaignView(db, c), flow: flowMatrix(db, c) }))
}

// 승인된 가게 목록 (새 기획전 만들기에서 고름)
export async function getApprovedMerchants() {
  await wait(READ_MS)
  return load().merchants.filter((m) => m.status === 'APPROVED')
}

// POST /api/admin/campaigns — 새 기획전 만들기. 가게들이 쿠폰 조건을 등록하면 시작 승인
export async function createCampaign({ title, startDate, endDate, merchantIds }) {
  await wait(CHAIN_MS)
  const db = load()
  if (!title.trim()) throw new ApiError('INVALID', '기획전 이름을 입력해 주세요.')
  if (!startDate || !endDate || endDate < startDate) throw new ApiError('INVALID', '기간을 확인해 주세요.')
  if (merchantIds.length < 2) throw new ApiError('INVALID', '참여 가게를 2곳 이상 골라 주세요.')
  const c = {
    id: `c${db.campaigns.length + 1}`,
    title: title.trim(),
    startDate,
    endDate,
    status: 'PREPARING',
    // 가게가 조건을 등록하기 전 기본값 (가게 화면에서 바꿈)
    terms: merchantIds.map((merchantId) => ({ merchantId, value: 2000, minOrder: 15000, validity: 'DAYS30', cap: 100000, registered: false })),
  }
  db.campaigns.push(c)
  addLedger(db, nowText(), 'ADMIN', `${c.title} 만들기 (참여 가게 ${merchantIds.length}곳)`, 'KCP', { campaignId: c.id })
  save(db)
  return c
}

// POST /api/admin/campaigns/{id}/status — 시작 승인(ACTIVE) / 일시 중지(PAUSED) / 다시 진행(ACTIVE) / 종료(ENDED)
// [가정] 일시 중지·종료 중에는 새 쿠폰 발급만 멈추고, 이미 받은 쿠폰은 유효기간까지 쓸 수 있다
export async function setCampaignStatus(campaignId, next) {
  await wait(CHAIN_MS)
  const db = load()
  const c = findCampaign(db, campaignId)
  const allowed = { PREPARING: ['ACTIVE'], ACTIVE: ['PAUSED', 'ENDED'], PAUSED: ['ACTIVE', 'ENDED'], ENDED: [] }
  if (!allowed[c.status].includes(next)) throw new ApiError('INVALID_STATUS', '지금 상태에서는 할 수 없어요.')
  if (c.status === 'PREPARING' && !c.terms.every((t) => t.registered)) throw new ApiError('NOT_READY', '참여 가게의 쿠폰 조건이 모두 등록돼야 시작할 수 있어요.')
  const label = { ACTIVE: c.status === 'PAUSED' ? '다시 진행' : '진행 중으로 바꿈', PAUSED: '일시 중지', ENDED: '종료' }[next]
  c.status = next
  addLedger(db, nowText(), 'ADMIN', `${c.title} ${label}`, 'KCP', { campaignId })
  save(db)
}

// GET /api/admin/ledger — 기록 전체 + 오늘 숫자 (목업 K3)
export async function getLedger() {
  await wait(READ_MS)
  const db = load()
  const t = today()
  const todayOf = (type) => db.ledger.filter((l) => l.type === type && dateOf(l.at) === t)
  return {
    stats: {
      issuedToday: todayOf('ISSUE').reduce((s, l) => s + l.couponIds.length, 0),
      usedToday: todayOf('USE').length,
      rejected: db.ledger.filter((l) => l.type === 'REJECT' && l.reason === 'COUPON_ALREADY_USED').length,
      merchants: db.merchants.filter((m) => m.status === 'APPROVED').length,
      activeCampaigns: db.campaigns.filter((c) => c.status === 'ACTIVE').length,
    },
    // 최신순. 같은 분(minute)에 남은 기록은 나중에 남은 것이 위로 (뒤집은 뒤 정렬 — 정렬은 순서가 같으면 그대로 둠)
    rows: [...db.ledger].reverse().sort((a, b) => b.at.localeCompare(a.at)),
  }
}

// 시연 데이터 처음으로 (리허설용)
// - mode 'ready'(기본): 기획전 진행 중 상태 → 바로 구매·쿠폰 받기 가능
// - mode 'demo': 시연 시작 상태 → KCP 가맹점 심사부터
export async function resetDemo(mode = 'ready') {
  setSimulation('') // 리허설 때 고른 실패 설정이 초기화 뒤 첫 구매에 나타나지 않게
  save(createSeed(mode))
}
