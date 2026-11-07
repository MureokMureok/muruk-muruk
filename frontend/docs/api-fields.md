# 프론트가 쓰는 API 응답 필드

백엔드 연동용 문서입니다. 함수 이름은 `frontend/src/api/api.js`의 함수이고, 필드는 **화면이 실제로 읽는 값만** 적었습니다. 여기 없는 필드는 내려줘도 되고 안 내려줘도 됩니다.

- 모의 응답 예시: `frontend/src/api/mock.js`, 호출 코드: `frontend/src/api/real.js`
- 주소는 백엔드와 맞출 제안입니다. 바뀌면 `real.js`만 고치면 됩니다.
- **쿠폰 상태 기준은 쿠폰 정책표(2026-11-04)입니다.**

## 전환 방법

`frontend/.env`에 아래 값을 둡니다.

| 값 | 뜻 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 주소 |
| `VITE_GOOGLE_CLIENT_ID` | 구글 클라이언트 ID. 둘 다 있어야 실서버 모드이고, 없으면 전부 모의로 동작합니다 |
| `VITE_REAL_APIS` | 실서버로 부를 함수 이름. 예: `getCampaign,purchase` / 전부: `all` / 비우면 로그인만 실서버 |

`VITE_REAL_APIS`에 함수를 하나라도 적으면 MY와 콘솔의 시연 도구가 숨겨집니다. 시연 도구는 모의 데이터에서만 동작하기 때문입니다. 값이 있어도 `npm run dev:mock`(5174번)은 전부 모의로 동작합니다.

## 공통 규칙

- 성공 응답: `{ isSuccess: true, code, message, result }`. 아래 필드는 모두 `result` 안의 값입니다.
- 인증: `Authorization: Bearer {accessToken}`. `userId`, `merchantId`는 토큰에서 읽습니다.
- 시각: `2026-11-03T18:20:00` 또는 `2026-11-03 18:20`, 한국 시간, 시간대 표시(`Z`) 없이. 날짜만: `2026-11-30`
- id: 숫자와 글자 모두 됩니다.
- 금액: 원 단위 정수
- 없는 가게·쿠폰: 404. 화면에서 "찾을 수 없어요"로 보여 줍니다.

### 상태 값

| 대상 | 값 |
|---|---|
| 쿠폰 | `LOCKED` 잠김 / `AVAILABLE` 사용 가능 / `PROCESSING` 사용 처리 중 / `USED` 사용 완료 / `VOIDED` 소멸 / `EXPIRED` 만료 |
| 기획전 | `PREPARING` / `ACTIVE` / `PAUSED` / `ENDED` |
| 가맹점 | `APPLIED` / `ACTIVE` / `SUSPENDED` / `REJECTED`. `ACTIVE`는 프론트가 화면용 `APPROVED`로 바꿉니다 |
| 기록 종류 `type` | `ISSUE` / `CONFIRM` / `APPLY` / `USE` / `REFUND` / `REJECT` / `ADMIN` |
| 유효기간 `validity` | `DAYS30` / `END` |

### 가맹점 업종

가입 요청과 조회 응답 모두 아래 값을 씁니다. 화면에는 `real.js`가 한글로 바꿔 보여 줍니다.

| 값 | 화면 글자 |
|---|---|
| `FLOWER_PLANT` | 꽃·식물 |
| `FRUIT` | 제철 과일 |
| `SEAFOOD` | 수산물 |
| `FARM_PRODUCE` | 농산물 |
| `SIDE_DISH` | 반찬·밀키트 |

### 실패 응답

`code`와 `message`를 내려 주면 대부분 `message`를 그대로 보여 줍니다. 화면 동작이 달라지는 코드는 아래입니다.

| code | 언제 | 함께 필요한 `result` 필드 |
|---|---|---|
| `COUPON_ALREADY_USED` | 사용 처리 중·사용 완료 쿠폰 재사용 | `checks`, `failedKey`, `couponStatus`, `usedAt`, `merchantName` |
| `PAYMENT_FAILED` | 결제 승인 실패 | 없음 |
| 그 밖의 쿠폰 사용 거절 | 내 쿠폰 아님, 다른 가게, 만료, 최소 주문, 잠김, 소멸 | `checks`, `failedKey` |

- `checks`: `{ owner, merchant, expiry, minOrder, unused }` 각각 true/false
- `failedKey`: 처음 실패한 항목 이름 (위 다섯 개 중 하나)
- `usedAt`: 사용 완료 시각, 처리 중이면 결제 적용 시각

## 소비자

### getCampaign
`GET /api/campaigns/current` · 로그인 없이 호출. 소비자 화면에 보여 줄 기획전 1개 (진행 중 → 일시 중지 → 준비 중 → 종료 순). 기획전이 하나도 없으면 404를 주면 화면이 "진행 중인 기획전이 없어요"로 바꿔 보여 줍니다
```fields
title
startDate
endDate
status
terms[].merchantId
terms[].merchantName
terms[].merchantCategory
terms[].value
terms[].minOrder
terms[].validity
terms[].registered
terms[].qtyLeft
terms[].qtyTotal
```

### getCampaigns
`GET /api/campaigns` · 로그인 없이 호출. 검색에 씁니다. 배열
```fields
[].id
[].title
[].status
[].terms[].merchantId
[].terms[].merchantName
[].terms[].merchantCategory
[].terms[].value
[].terms[].registered
[].terms[].qtyLeft
[].terms[].product.name
[].terms[].product.price
```

### getProduct
`GET /api/merchants/{merchantId}/product` · 로그인 없이 호출. 가게의 대표 상품 1개
```fields
name
price
merchantName
merchantCategory
```

### previewPurchase
`GET /api/merchants/{merchantId}/purchase-preview` · 로그인 없이 호출. 저장 없이 이 가게에서 사면 받을 쿠폰을 계산
```fields
campaignStatus
coupons[].merchantName
coupons[].value
coupons[].minOrder
coupons[].validity
coupons[].expiresAt
missed[].merchantName
```

### purchase
`POST /api/orders` · 요청 `{ merchantId }`. A 가게 결제. 쿠폰은 `LOCKED`로 발급하고, 한도가 찬 가게만 빠집니다
```fields
order.id
issuedCoupons[].id
issuedCoupons[].status
issuedCoupons[].merchantName
issuedCoupons[].value
issuedCoupons[].minOrder
issuedCoupons[].expiresAt
missedCoupons[].merchantName
missedCoupons[].value
missedCoupons[].reason
```

### getMyCoupons
`GET /api/me/coupons` · 소멸 쿠폰도 내려 줍니다 (화면에서 숨김). 배열
```fields
[].id
[].tokenId
[].status
[].merchantName
[].value
[].minOrder
[].expiresAt
[].issuedAt
[].lastTx
[].policyId
```
`policyId`는 일반 쿠폰일 때만 값이 있습니다. `lastTx`는 쿠폰 상태를 마지막으로 바꾼 tx 해시입니다.

### getCoupon
`GET /api/coupons/{couponId}` · 내 쿠폰이 아니면 404
```fields
id
tokenId
status
title
merchantId
merchantName
merchantShort
merchantCategory
value
minOrder
expiresAt
issuedAt
lastTx
policyId
orderId
useOrderId
fromMerchantName
issuedTogether
```
`orderId`는 쿠폰을 발급한 A 주문, `useOrderId`는 쿠폰을 적용한 B 주문, `issuedTogether`는 같은 구매로 받은 쿠폰 수입니다.

### getCouponHistory
`GET /api/coupons/{couponId}/history` · 시간순 배열
```fields
[].id
[].type
[].at
[].merchantName
[].tx
[].summary
[].claimed
[].voided
[].reason
[].couponStatus
```
`summary`는 짧은 설명(`쿠폰 복원` 등)입니다. `claimed`는 일반 쿠폰 받기 기록에서 true입니다. `voided`는 소멸 기록이면 true, `reason`과 `couponStatus`는 `REJECT` 기록의 실패 code와 그때 쿠폰 상태입니다.

### getMySummary
`GET /api/me/summary`
```fields
received
used
saved
```
소멸 쿠폰은 받은 수에서 빼고, 아낀 금액은 구매 확정한 주문만 더합니다.

### redeemCoupon
`POST /api/orders` · 요청 `{ merchantId, couponId }`. B 가게 결제에 쿠폰 적용. 쿠폰은 `PROCESSING`이 됩니다
```fields
order.id
order.amount
order.discount
coupon.status
coupon.policyId
coupon.merchantName
coupon.value
```

### confirmOrder
`POST /api/orders/{orderId}/confirm` · A 주문이면 잠긴 쿠폰이 전부 `AVAILABLE`, B 주문이면 쿠폰이 `USED`
```fields
order.amount
order.discount
coupons[].id
coupons[].status
coupons[].policyId
coupons[].merchantName
coupons[].value
coupons[].minOrder
coupons[].expiresAt
leftCoupons[].merchantName
leftCoupons[].value
```

### cancelOrder
`POST /api/orders/{orderId}/cancel` · A 주문이면 잠긴 쿠폰이 전부 `VOIDED`, B 주문이면 쿠폰이 `AVAILABLE` 복원. 구매 확정 후에는 거절
```fields
coupons[].status
coupons[].policyId
coupons[].merchantName
coupons[].value
coupons[].minOrder
coupons[].expiresAt
```

### getCouponOffers
`GET /api/coupon-policies` · 로그인 없이 호출, 로그인했으면 내가 받았는지도 표시. 일반 쿠폰. 배열
```fields
[].id
[].name
[].merchantName
[].value
[].minOrder
[].validDays
[].qtyLeft
[].myCouponId
```

### claimCoupon
`POST /api/coupon-policies/{policyId}/claim` · 받으면 바로 `AVAILABLE`. 화면은 성공 여부만 씁니다. 실패 `message`는 그대로 보여 줍니다

## 가맹점

로그인 응답의 `merchantId`와 `status`를 그대로 씁니다.

### getMerchant
`GET /api/merchants/me`
```fields
name
category
status
```

### getStoreDashboard
`GET /api/merchants/me/dashboard` · `issued`, `qtyTotal`, `used`, `burden`, `cap`은 진행 중 기획전의 합계입니다
```fields
merchant.name
asOf
activeCount
activeTitle
issued
qtyTotal
used
burden
cap
links.sent
links.received
links.partners[].merchantId
links.partners[].name
links.partners[].sent
links.partners[].received
recent[].id
recent[].type
recent[].at
recent[].tx
recent[].customer
recent[].discount
recent[].detail
recent[].actor
recent[].summary
recent[].reason
recent[].claimed
campaigns[].id
campaigns[].title
campaigns[].startDate
campaigns[].endDate
campaigns[].status
campaigns[].mine.registered
campaigns[].mine.value
campaigns[].mine.minOrder
campaigns[].mine.issued
campaigns[].mine.qtyTotal
campaigns[].mine.used
```
`links.sent`, `links.received`는 사람 수입니다. 일반 쿠폰은 넣지 않습니다. `customer`는 가린 이름(`지*`)입니다. `recent`는 최신순 4건입니다.

### getStoreCampaigns
`GET /api/merchants/me/campaigns` · 내 가게가 참여한 기획전. 배열
```fields
[].id
[].title
[].startDate
[].endDate
[].status
[].terms[].merchantId
[].terms[].merchantName
[].terms[].merchantCategory
[].terms[].value
[].terms[].minOrder
[].terms[].validity
[].terms[].cap
[].terms[].registered
[].terms[].draft
[].terms[].issued
[].terms[].qtyTotal
[].terms[].used
[].history[].id
[].history[].detail
[].history[].at
[].history[].actor
```

### saveTerms
`PUT /api/merchants/me/campaigns/{campaignId}/terms` · 요청 `{ value, minOrder, validity, cap, register }`. 준비 중인 기획전만 됩니다. `register`가 false면 임시 저장이고, 이미 등록한 조건의 임시 저장은 거절합니다. 응답 필드는 쓰지 않습니다

### getStorePolicies
`GET /api/merchants/me/coupon-policies` · 배열
```fields
[].id
[].name
[].value
[].minOrder
[].validDays
[].quantity
[].claimed
[].used
[].createdAt
```

### publishPolicy
`POST /api/merchants/me/coupon-policies` · 기존 API 요청 그대로 `{ name, discountAmount, receiveType: "DIRECT", minOrderAmount, validDays, usableScope: "OWN_SHOP", quantity }`. 응답 필드는 쓰지 않습니다

### getBurden
`GET /api/merchants/me/burden`
```fields
burden
usedCount
sales
newCustomers
rows[].id
rows[].tokenId
rows[].at
rows[].customer
rows[].source
rows[].amount
rows[].discount
rows[].tx
```
`source`는 `과수원집 구매` 또는 `직접 받기`입니다.

## KCP 관리자

### getMerchants
`GET /api/admin/merchants` · 심사 대기 먼저. 배열
```fields
[].id
[].name
[].category
[].appliedAt
[].status
[].kcpPay
[].bizChecked
[].channel
[].scale
```

### reviewMerchant
`PATCH /api/admin/merchants/{merchantId}/status` · 요청 `{ status: "ACTIVE" }` 승인, `{ status: "REJECTED" }` 반려. 응답 필드는 쓰지 않습니다

### getAdminCampaigns
`GET /api/admin/campaigns` · 배열
```fields
[].id
[].title
[].startDate
[].endDate
[].status
[].terms[].merchantName
[].terms[].registered
[].terms[].issued
[].terms[].qtyTotal
[].flow[].merchantId
[].flow[].name
[].flow[].cells[]
```
`flow`는 보낸 가게별 한 줄입니다. `cells`는 같은 순서의 받은 가게별 사용 수이고, 자기 자신은 `null`입니다.

### getApprovedMerchants
`GET /api/admin/merchants?status=ACTIVE` · 새 기획전에서 고를 가게. 배열
```fields
[].id
[].name
```

### createCampaign
`POST /api/admin/campaigns` · 요청 `{ title, startDate, endDate, merchantIds }`. 가게 2곳 이상
```fields
id
```

### setCampaignStatus
`PATCH /api/admin/campaigns/{campaignId}/status` · 요청 `{ status }`. 허용: `PREPARING→ACTIVE`, `ACTIVE→PAUSED·ENDED`, `PAUSED→ACTIVE·ENDED`. 모든 가게가 조건을 등록해야 시작됩니다. 응답 필드는 쓰지 않습니다

### getLedger
`GET /api/admin/ledger`
```fields
stats.issuedToday
stats.usedToday
stats.rejected
stats.merchants
stats.activeCampaigns
rows[].id
rows[].tx
rows[].at
rows[].type
rows[].detail
rows[].actor
```
`rejected`는 재사용 시도(`COUPON_ALREADY_USED`) 거절 수입니다. `rows`는 최신순입니다.

## 확인이 필요한 것

1. 비회원 둘러보기: `getCampaign`, `getCampaigns`, `getProduct`, `previewPurchase`, `getCouponOffers`는 로그인 없이 열려야 합니다. 지금 `SecurityConfig`에서는 막혀 있습니다.
2. 반려: 백엔드 가맹점 상태에 `REJECTED`가 없습니다. 추가하거나 반려 버튼을 뺄지 정해야 합니다.
3. 가맹점 첫 로그인: `POST /api/auth/google`이 이용자 계정을 먼저 만들어서, 가입 선택 화면에서 나가면 다음부터 소비자로 로그인됩니다.
4. 쿠폰 사용 때 주문 금액: 프론트는 금액을 보내지 않습니다. 서버가 상품 가격으로 계산합니다.
5. 이름 변경: 백엔드 API 없이 프론트가 브라우저에 사용자별로 저장합니다. 그래서 다른 기기나 다른 브라우저에서는 구글 이름으로 보입니다.
