// 실서버 호출. mock.js와 함수 이름·인자·돌려주는 값이 같아서 화면 코드는 바뀌지 않는다
// 주소와 응답 필드는 frontend/docs/api-fields.md. 사용자·가맹점은 서버가 토큰으로 알아내므로 id 인자를 보내지 않는다
import { request } from './http.js'

const path = (strings, ...values) => strings.reduce((out, s, i) => out + encodeURIComponent(values[i - 1]) + s)

// 없는 가게·쿠폰은 화면에서 "찾을 수 없어요"로 보여 주므로 오류가 아니다
const orNull = (promise) =>
  promise.catch((err) => {
    if (err.status === 404) return null
    throw err
  })

// 백엔드 승인 상태 이름(ACTIVE)을 화면 이름(APPROVED)으로 맞춘다
const toScreenStatus = (merchant) => (merchant?.status === 'ACTIVE' ? { ...merchant, status: 'APPROVED' } : merchant)

// ---------- 소비자 ----------
export const getCampaign = () => request('GET', '/api/campaigns/current')
export const getCampaigns = () => request('GET', '/api/campaigns')
export const getProduct = (merchantId) => orNull(request('GET', path`/api/merchants/${merchantId}/product`))
export const previewPurchase = (merchantId) => request('GET', path`/api/merchants/${merchantId}/purchase-preview`)
export const purchase = (_userId, merchantId) => request('POST', '/api/orders', { merchantId })
export const getMyCoupons = () => request('GET', '/api/me/coupons')
export const getCoupon = (couponId) => orNull(request('GET', path`/api/coupons/${couponId}`))
export const getCouponHistory = (couponId) => request('GET', path`/api/coupons/${couponId}/history`)
export const getMySummary = () => request('GET', '/api/me/summary')
export const redeemCoupon = (_userId, couponId, merchantId) => request('POST', '/api/orders', { merchantId, couponId })
export const confirmOrder = (_userId, orderId) => request('POST', path`/api/orders/${orderId}/confirm`)
export const cancelOrder = (_userId, orderId) => request('POST', path`/api/orders/${orderId}/cancel`)
export const getCouponOffers = () => request('GET', '/api/coupon-policies')
export const claimCoupon = (_userId, policyId) => request('POST', path`/api/coupon-policies/${policyId}/claim`)

// ---------- 가맹점 ----------
export const getMerchant = async () => toScreenStatus(await request('GET', '/api/merchants/me'))
export const getStoreDashboard = () => request('GET', '/api/merchants/me/dashboard')
export const getStoreCampaigns = () => request('GET', '/api/merchants/me/campaigns')
export const saveTerms = (_merchantId, campaignId, form, register) => request('PUT', path`/api/merchants/me/campaigns/${campaignId}/terms`, { ...form, register })
export const getStorePolicies = () => request('GET', '/api/merchants/me/coupon-policies')
export const getBurden = () => request('GET', '/api/merchants/me/burden')

// 기존 백엔드 일반 쿠폰 발행 API의 필드 이름에 맞춘다 (CouponPolicyCreateRequest)
export const publishPolicy = (_merchantId, form) =>
  request('POST', '/api/merchants/me/coupon-policies', {
    name: form.name.trim(),
    discountAmount: form.value,
    receiveType: 'DIRECT',
    minOrderAmount: form.minOrder,
    validDays: form.validDays,
    usableScope: 'OWN_SHOP',
    quantity: form.quantity,
  })

// ---------- KCP 관리자 ----------
export const getMerchants = async () => (await request('GET', '/api/admin/merchants')).map(toScreenStatus)
export const reviewMerchant = (merchantId, approve) => request('PATCH', path`/api/admin/merchants/${merchantId}/status`, { status: approve ? 'ACTIVE' : 'REJECTED' })
export const getAdminCampaigns = () => request('GET', '/api/admin/campaigns')
export const getApprovedMerchants = async () => (await request('GET', '/api/admin/merchants?status=ACTIVE')).map(toScreenStatus)
export const createCampaign = (form) => request('POST', '/api/admin/campaigns', form)
export const setCampaignStatus = (campaignId, next) => request('PATCH', path`/api/admin/campaigns/${campaignId}/status`, { status: next })
export const getLedger = () => request('GET', '/api/admin/ledger')
