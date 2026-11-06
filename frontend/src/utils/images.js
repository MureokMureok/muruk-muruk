// 백엔드에 이미지 필드가 없어 프론트 폴더(public/images)의 그림을 쓴다. 키는 모의 데이터의 가게 ID다
const PRODUCT_IMAGES = {
  m1: '/images/product-orchard.png',
  m2: '/images/product-flower.png',
  m3: '/images/product-sea.png',
}

export const CAMPAIGN_IMAGE = '/images/campaign-winter.png'
export const productImage = (merchantId) => PRODUCT_IMAGES[merchantId]
