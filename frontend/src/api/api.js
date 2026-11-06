// 화면이 부르는 함수 모음. 함수마다 실서버(real.js)와 모의(mock.js) 중 하나를 고른다 (api/mode.js)
import { isRealApi } from './mode.js'
import * as mock from './mock.js'
import * as real from './real.js'

const pick = (name) => (isRealApi(name) ? real[name] : mock[name])

// 시연 도구와 화면 규칙은 서버와 상관없다
export { ApiError, SIMULATIONS, USE_CHECKS, calcDiscount, getSimulation, resetDemo, setSimulation } from './mock.js'

// 소비자
export const getCampaign = pick('getCampaign')
export const getCampaigns = pick('getCampaigns')
export const getProduct = pick('getProduct')
export const previewPurchase = pick('previewPurchase')
export const purchase = pick('purchase')
export const getMyCoupons = pick('getMyCoupons')
export const getCoupon = pick('getCoupon')
export const getCouponHistory = pick('getCouponHistory')
export const getMySummary = pick('getMySummary')
export const redeemCoupon = pick('redeemCoupon')
export const confirmOrder = pick('confirmOrder')
export const cancelOrder = pick('cancelOrder')
export const getCouponOffers = pick('getCouponOffers')
export const claimCoupon = pick('claimCoupon')

// 가맹점
export const getMerchant = pick('getMerchant')
export const getStoreDashboard = pick('getStoreDashboard')
export const getStoreCampaigns = pick('getStoreCampaigns')
export const saveTerms = pick('saveTerms')
export const getStorePolicies = pick('getStorePolicies')
export const publishPolicy = pick('publishPolicy')
export const getBurden = pick('getBurden')

// KCP 관리자
export const getMerchants = pick('getMerchants')
export const reviewMerchant = pick('reviewMerchant')
export const getAdminCampaigns = pick('getAdminCampaigns')
export const getApprovedMerchants = pick('getApprovedMerchants')
export const createCampaign = pick('createCampaign')
export const setCampaignStatus = pick('setCampaignStatus')
export const getLedger = pick('getLedger')
