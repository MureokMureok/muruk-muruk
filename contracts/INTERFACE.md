# 쿠폰 컨트랙트 인터페이스 v3

- 코드: [`contracts/interfaces/IMurukCoupon.sol`](contracts/interfaces/IMurukCoupon.sol), 구현 [`contracts/MurukCoupon.sol`](contracts/MurukCoupon.sol), 테스트 `test/` (시연 8장면 포함)
- 기준 자료: 프론트 모의 API 11/3 (`frontend/src/api/core.js`, `api.js`, `seed.js` — `feature/frontend` 브랜치) · 프론트 README "확정 사항" · Figma 와이어프레임 (소비자 ①~⑫ · 가맹점 센터 M1~M4 · KCP 관리자 K1~K3) · KCP 미팅 "락업"(10/30) · 공동구매 설계안 슬라이드(11/4)
- v2 → v3: **발급 락업**(구매 확정 전 쿠폰 잠금), **사용 락업**(결제 확정 전 쿠폰 잠금, 즉시 소각 `redeem` 대체), **결제당 쿠폰 1장**, **기획전 참여 가게 최대 20곳**
- v1 → v2: 예치금·충전금 폐지(11/3, 법률 문제) → 가게는 할인 한도(상한)만. 서명·규칙 잠금 삭제. 가맹점 직접 발행 범위 밖. 가맹점 등록 → 심사. 기획전 승인·반려 → 시작 승인·일시 중지·종료

## 1. 기본 전제

| 항목 | 내용 |
|---|---|
| 표준 | ERC-1155. **쿠폰 1장 = tokenId 1개 (수량 1)**, tokenId는 1부터 증가 (`0` = 없음) |
| 양도 | 불가. 전송은 `TransferDisabled`로 막음 (발급·소각만, 승인받은 사람도 불가) |
| 로그인·서명 | 소비자·가맹점·KCP 모두 소셜 로그인 → **백엔드 서버 지갑이 대신 호출**. 블록체인 용어·지갑 주소는 화면에 노출하지 않음 |
| 권한 | `ADMIN` = KCP 관리자 기능 / `OPERATOR` = 백엔드 (가맹점·소비자 요청 대행) |
| 가맹점 구분 | `merchantId`(번호). 가게 지갑 주소는 받지 않음 (K1) |
| 쿠폰 종류 | **정액권만** (11/3 확정 "정률 없음") |
| 단위 | 금액 = 원(정수), 시각 = unix seconds |
| 체인에 올리지 않는 것 | 기획전 이름, 가게 이름, 소비자 이름·주문 상세 (기록 번호와 ID만) |

## 2. 전체 흐름 (시연 8장면 순서 — frontend/README.md)

```
1 KCP      reviewMerchant(가게, 승인)                  가맹점 심사 (승인된 가게만 기획전 참여)
   KCP      createCampaign(기획전, [가게 2~20곳], 시작, 종료)  기획전 만들기 → 준비 중
2 가맹점    registerTerms(기획전, 가게, 할인, 최소주문, 유효기간, 할인한도)
             → 최대 발급 수 = 할인 한도 ÷ 할인 금액 (준비 중에는 다시 등록해서 바꿀 수 있음)
3 KCP      setCampaignStatus(기획전, Active)           조건이 모두 등록돼야 시작 승인
4 소비자 A 가게 구매 → 백엔드 issueForPurchase(기획전, A, 소비자, 주문ID)
             → 나머지 참여 가게 쿠폰 1장씩, **확정 대기**로 발급 (구매한 가게 쿠폰은 없음)
             → 최대 발급 수에 닿은 가게는 IssueSkipped (그 가게만 빠짐)
   A 구매 확정 → confirmPurchase(주문ID)               쿠폰이 사용 가능으로      [발급 락업]
   A 구매 취소 → cancelPurchase(주문ID)                쿠폰 무효·소각, 발급 수 반환
5 쿠폰함    statusOf / couponOf                         확정 대기 / 사용 가능 / 결제 중 / 사용 완료 / 만료 / 무효
6 소비자 B 가게에서 사용
   결제 시작 → lockForPayment(쿠폰, 소비자, B, 주문금액, 결제ID)   5가지 검사 → 쿠폰 잠금   [사용 락업]
   결제 확정 → confirmPayment(결제ID)                  소각 (CouponRedeemed), B 할인 부담에 더함
   결제 취소 → cancelPayment(결제ID)                   쿠폰 사용 가능으로 복원
7 재사용    lockForPayment → AlreadyUsed로 거절 (RedeemRejected 기록, 쿠폰 상태 변화 없음)
8 할인 부담·기록 조회 → termOf() / 이벤트 조회
```

기획전 상태 (모의 API `setCampaignStatus`와 같음):

```
Preparing ──시작 승인(조건 전원 등록)──▶ Active ⇄ Paused
                                          │        │
                                          └──┬─────┘
                                             ▼
                                           Ended   ← KCP가 종료하거나, 종료 시각이 지나면 자동 (K2)
```

- 발급은 `Active`이면서 종료 시각 전일 때만. `Paused`·`Ended`에서는 새 발급만 멈추고, 이미 받은 쿠폰은 유효기간까지 쓸 수 있음
- 쿠폰 조건은 `Preparing`에서만 등록·변경 가능 (시작 후 변경 불가)
- 종료 시각이 지나면 어떤 상태 전환도 할 수 없다 (준비 중이었더라도 시작 승인 불가)
- 시작은 **KCP 시작 승인**으로 정해진다. `startsAt`은 기록·표시용이고 발급 조건이 아니다 (모의 API도 날짜가 아니라 상태로 판단)

쿠폰 상태:

```
            confirmPurchase              lockForPayment             confirmPayment
 Pending ─────────────────▶ Available ─────────────────▶ Locked ─────────────────▶ Used (소각)
 (확정 대기)                (사용 가능)  ◀─────────────────  (결제 중)
    │                          │        cancelPayment
    │ cancelPurchase           └── 유효기간 지남 ──▶ Expired (조회 시 계산)
    ▼
 Voided (무효, 소각)
```

## 3. 할인 한도와 할인 부담 (예치금 없음)

```
가게 조건(Term) — 기획전마다, 가게마다
 ├─ amount / minOrder / validity   쿠폰 조건 (M2)
 ├─ cap        할인 한도(상한). 돈을 맡기지 않음
 ├─ maxIssue   최대 발급 수 = cap ÷ amount (내림)
 ├─ issuedCount 발급된 수 → maxIssue에 닿으면 그 가게 쿠폰만 발급 중단. 구매 취소로 무효가 되면 1 줄어듦
 ├─ usedCount  사용(결제 확정)된 수
 └─ burden     할인 부담 = 실제로 쓰인 할인액 합계 (M4). 실제 정산(돈 이동)은 범위 밖
```

유효기간 (`Validity`) — **발급할 때 정해지고**, 구매 확정을 기다리는 동안에도 흐른다:

| 값 | 의미 | 만료 시각 |
|---|---|---|
| `Days30` | 받은 날(발급일)부터 30일 | 받은 날(KST)로부터 30일째 되는 날 **23:59:59 KST** (예: 11/4 발급 → 12/4 23:59:59) |
| `CampaignEnd` | 기획전 종료일까지 | `createCampaign`의 `endsAt` |

## 4. 함수

### 쓰기

| 함수 | 누가 | 하는 일 | 실패하면 (에러 → 모의 API code) |
|---|---|---|---|
| `reviewMerchant(merchantId, approve)` | ADMIN | 가맹점 승인/반려 (K1) | 이미 심사함 `NotPending` → `NOT_PENDING` |
| `createCampaign(campaignId, merchantIds, startsAt, endsAt)` | ADMIN | 기획전 만들기 → `Preparing` (K2) | 승인 안 된 가게 `NotApproved`, 가게 2곳 미만·종료 < 시작·가게 중복·번호 0 `InvalidCampaign` → `INVALID`, 21곳 이상 `TooManyMerchants`, 중복 번호 `CampaignExists` |
| `registerTerms(campaignId, merchantId, amount, minOrder, validity, cap)` | OPERATOR | 쿠폰 조건 등록·변경 (M2 "기획전에 등록하기") | 없는 기획전 `CampaignNotFound`, 미참여 가게 `NotInCampaign`, 준비 중 아님·종료 시각 지남 `TermsLocked` → `LOCKED`, 할인 0·최소 주문 < 할인·할인 한도 < 할인 `InvalidTerms` → `INVALID` |
| `setCampaignStatus(campaignId, next)` | ADMIN | 시작 승인 / 일시 중지 / 다시 진행 / 종료 (K2) | 없는 기획전 `CampaignNotFound`, 허용 안 된 전환·종료 시각 지남 `InvalidStatus` → `INVALID_STATUS`, 조건 미등록 가게 있음 `NotReady` → `NOT_READY` |
| `issueForPurchase(campaignId, buyMerchantId, to, orderRef)` | OPERATOR | 구매 시 쿠폰 발급, **확정 대기** (③④) | 받는 주소 0 `InvalidAddress`, 주문 ID 0 `InvalidRef`, 같은 주문 재호출 `OrderAlreadyIssued`. 진행 중이 아니거나 미참여 가게면 **에러 없이 0장** |
| `confirmPurchase(orderRef)` | OPERATOR | 구매 확정 → 그 주문의 쿠폰을 사용 가능으로 | 확정 대기 주문이 아님 `OrderNotPending` |
| `cancelPurchase(orderRef)` | OPERATOR | 확정 전 구매 취소 → 쿠폰 무효·소각, 발급 수 반환 | 확정 대기 주문이 아님 `OrderNotPending` (확정 후 환불은 범위 밖) |
| `lockForPayment(tokenId, owner, merchantId, orderAmount, payRef)` | OPERATOR | 결제 시작 → 5가지 검사 후 쿠폰 잠금 (⑥⑨) | 결제 ID 0 `InvalidRef`, 이미 쿠폰이 잠겼거나 확정된 결제 `PaymentExists` (**결제당 1장**). 검사 실패는 **되돌리지 않음** — `(false, reason)` 반환 + `RedeemRejected` |
| `confirmPayment(payRef)` | OPERATOR | 결제 확정 → 소각, 할인 부담에 더함. 할인액 반환 | 결제 중이 아님 `PaymentNotLocked` |
| `cancelPayment(payRef)` | OPERATOR | 결제 취소 → 쿠폰 사용 가능으로 복원 (⑨-d) | 결제 중이 아님 `PaymentNotLocked` |

### 조회 (누구나, 가스비 없음)

| 함수 | 돌려주는 것 | 화면 |
|---|---|---|
| `check`, `checkAll` | 사용 가능 여부 / 5가지 항목별 결과 (`unused` = 지금 사용 가능 상태인가) | ⑦ '사용하기' 활성, ⑧ 적용 가능 여부, ⑨-c 쿠폰 확인 결과 |
| `statusOf`, `couponOf`, `ownerOfCoupon` | 쿠폰 상태·내용·원래 주인 | ⑥ 쿠폰함 3탭, ⑦ 쿠폰 상세, ⑫ 기록 |
| `merchantOf` | 심사 상태 (`None`/`Approved`/`Rejected`) | K1 |
| `campaignOf` | 상태(종료 시각 지나면 `Ended`), 참여 가게, 시작·종료 | ② 기획전 상세, M3, K2 |
| `termOf` | 조건 + 최대 발급 수·발급 수·사용 수·할인 부담 | ② "남은 수량", M1 대시보드, M3 발급/한도, M4 할인 부담 |
| `issuedFor`, `orderOf` | 이 주문으로 발급된 tokenId (기획전 가게 목록 순), 주문 상태 | ④-b 발급 확인 중 → 결과 조회 |
| `paymentOf` | 결제 상태·잠긴 쿠폰·사용 가게·주문 금액 | ⑨-b 사용 확인 중 → 결과 조회 |

쿠폰함 3탭 대응: **사용 가능** = `Available`(+ 확정 대기 `Pending`·결제 중 `InUse`는 표시 방법을 화면에서 정함) / **사용 완료** = `Used` / **만료** = `Expired`. `Voided`(구매 취소)는 목록에서 빼거나 따로 표시.

### 이벤트 (기록 조회 K3 · ⑫ · M1 최근 기록 · M4)

| 이벤트 | 종류 (K3 필터) | 내용 |
|---|---|---|
| `MerchantReviewed` | 관리 | 가맹점 승인·반려 |
| `CampaignCreated` | 관리 | 기획전 만들기 |
| `TermsRegistered` | 관리 | 쿠폰 조건 등록 (다시 등록할 때마다 남음 = 조건 변경 이력) |
| `CampaignStatusChanged` | 관리 | 상태 전환 (from → to) |
| `CouponIssued` | 발급 | 쿠폰·사용처·받은 사람·구매 가게(`fromMerchantId`, "어디서 온 손님")·주문·만료 시각 |
| `IssueSkipped` | 발급 | 한도 소진으로 못 준 가게 (④-c "쿠폰이 모두 소진됐어요") |
| `PurchaseConfirmed` + `CouponActivated` | 발급 | 구매 확정 → 쿠폰 사용 가능 |
| `PurchaseCancelled` + `CouponVoided` | 발급 | 구매 취소 → 쿠폰 무효 |
| `CouponLocked` | 사용 | 결제 시작 → 쿠폰 잠금 |
| `CouponUnlocked` | 사용 | 결제 취소 → 쿠폰 복원 |
| `CouponRedeemed` | 사용 | 결제 확정. 사용처(`merchantId`) · 구매 가게(`fromMerchantId`, K2 손님 흐름 · M1 "우리에게 온 손님") · 할인액(`discount`, 할인 부담) · 결제 금액(`orderAmount`, M4 "쿠폰으로 생긴 매출") |
| `RedeemRejected` | 거절 | **사용을 시도한 가게**(`merchantId`, M1 최근 기록) · 거절 사유 (재사용 시도 거절 = K3 "컨트랙트가 차단") |

### 사용 거절 사유 (`Reason`)

검사 순서대로 첫 번째로 틀린 항목이 사유가 된다. 1~5는 ⑨-c 5항목(모의 API `USE_CHECKS`), 6~8은 락업 상태.

| 순서 | Reason | 검사 항목 | 모의 API code |
|---|---|---|---|
| 1 | `NotOwner` | 내 쿠폰인가 (없는 쿠폰 포함) | `NOT_OWNER` |
| 2 | `WrongMerchant` | 쓸 수 있는 가게인가 | `WRONG_MERCHANT` |
| 3 | `Voided` | 구매 취소로 무효가 된 쿠폰 | — |
| 4 | `NotConfirmed` | 구매 확정 전 쿠폰 | — |
| 5 | `Expired` | 유효기간 안인가 | `EXPIRED` |
| 6 | `BelowMinOrder` | 최소 주문 금액 | `MIN_ORDER_NOT_MET` |
| 7 | `AlreadyUsed` | 아직 안 쓴 쿠폰인가 | `COUPON_ALREADY_USED` |
| 8 | `InUse` | 다른 결제에 사용 중 | — |

(표의 "순서"는 검사 순서이고, `Reason` 숫자 값은 `Ok=0, NotOwner=1, WrongMerchant=2, Expired=3, BelowMinOrder=4, AlreadyUsed=5, NotConfirmed=6, InUse=7, Voided=8`)

이미 쓴 쿠폰을 기간이 지난 뒤 다시 쓰면 사유는 `Expired`다. K3 "재사용 시도 거절" 건수를 셀 때 `reason == AlreadyUsed`만 세면 이런 경우가 빠지므로, 필요하면 `couponOf(tokenId).state`도 함께 본다.

## 5. 백엔드가 지켜야 할 것

1. **쿠폰 사용 순서**: 결제 요청 전에 `lockForPayment` → PG 결제가 확정되면 `confirmPayment`, 결제가 실패·취소되면 `cancelPayment`. 잠금 시간 제한은 없으므로 결제 결과를 못 받으면 백엔드가 확인한 뒤 둘 중 하나를 꼭 부른다.
2. **쿠폰 발급 순서**: 구매 완료 시 `issueForPurchase` → 구매가 확정되면 `confirmPurchase`, 확정 전에 취소·환불되면 `cancelPurchase`. 무엇을 "구매 확정"으로 볼지(PG 승인 시점 / 쇼핑몰 구매 확정)는 팀 결정을 따른다. 시연에서는 결제 직후 바로 확정해도 된다.
3. `lockForPayment`는 검사에서 거절해도 **트랜잭션은 성공**한다. 반환값 또는 `RedeemRejected` 이벤트를 꼭 확인한다.
4. **결제당 쿠폰 1장**: 한 결제(`payRef`)에 쿠폰이 잠긴 뒤에는 다른 쿠폰을 잠글 수 없다 (`PaymentExists`). 결제를 취소하면 같은 `payRef`를 다시 쓸 수 있다.
5. `orderRef`·`payRef`는 백엔드 주문·결제 ID를 `keccak256` 한 값. 개인정보를 넣지 않는다. 같은 `orderRef`는 **기획전과 상관없이 한 번만** 쓸 수 있다. 한 가게가 진행 중인 기획전 여러 개에 참여해서 한 주문으로 여러 번 부를 때는 `keccak256(주문ID, campaignId)`처럼 기획전마다 다른 값을 쓴다.
6. 응답이 늦으면 재호출하지 말고 `orderOf`·`issuedFor` / `paymentOf`·`statusOf`로 먼저 조회한다 (E-04 발급 결과 불명확, E-05 사용 결과 불명확 — "확인 중" 표시 후 조회).
7. `createCampaign`의 `endsAt`은 종료일 23:59:59(KST)처럼 **마지막으로 발급할 수 있는 시각**을 넣는다. `CampaignEnd` 쿠폰의 만료 시각도 이 값이다.
8. 화면의 만료 날짜는 `couponOf().expiresAt`을 KST로 바꿔서 보여준다 (⑦-b "만료 판정 시각과 체인의 유효기간 검증 기준을 맞출 것").
9. 가맹점 신청(APPLIED)·임시 저장은 백엔드 DB에서 처리하고, 체인에는 심사 결과와 "기획전에 등록하기"만 보낸다.
10. 배포할 때 `admin`(KCP 지갑)·`operator`(백엔드 서버 지갑) 주소를 파라미터 파일로 꼭 넣는다. 배포 모듈에 기본값이 없어서 빠뜨리면 배포가 멈춘다 (로컬용: `ignition/parameters.local.json`).

## 6. 모의 API와 다른 점 / 범위 밖

| 항목 | 내용 |
|---|---|
| 발급·사용 락업 | 모의 API에는 없음 (발급 즉시 사용 가능, 검사 후 즉시 사용 완료). 11/4 사용자 결정으로 추가 — KCP 미팅 "락업", 공동구매 설계안 "결제 때 잠김 발급 → 구매 확정 후 해제" |
| 결제당 쿠폰 1장 | 11/4 사용자 결정 (Figma ⑧ "쿠폰 여러 장 중복 적용 — 불허 권장") |
| 기획전 참여 가게 최대 20곳 | 11/4 사용자 결정 ("적당히"). 구매 1건 가스 20곳 약 515만 (블록 한도 1,200만의 약 43%) |
| 기획전 종료 | 모의 API는 상태로만 판단. 컨트랙트는 **종료 시각이 지나면 자동으로 발급 중단** (Figma K2 "기간이 끝나면 자동 종료") |
| 만료 판정 | 모의 API는 날짜(마지막 날까지), 컨트랙트는 그 날 23:59:59 KST 시각 — 같은 결과 |
| 여러 기획전 동시 진행 | 모의 API는 구매 가게가 참여한 진행 중 기획전을 모두 봄. 컨트랙트는 `campaignId`로 지정된 기획전 하나만 |
| 구매 확정 **후** 환불 시 쿠폰 회수 | 범위 밖 (이미 쓴 쿠폰은 되돌릴 수 없음, 정책 미정) |
| 결제 확정 **후** 환불 시 쿠폰 돌려주기 | 범위 밖 (소각 후라 새로 발급해야 함, 정책 미정) |
| 잠금 자동 해제(타임아웃) | 없음 — 백엔드가 `cancelPayment`/`cancelPurchase`로 처리 |
| 실제 정산(돈 이동) | 범위 밖 — `burden`은 기록만 |
| 가맹점 직접 발행 (첫 구매·N번째 방문 등) | 범위 밖 (가맹점 센터 메모 "일반 쿠폰 발행 — 이번 범위 제외") |

## 7. 구현하면서 정한 것 (자료 기준 해석)

| 항목 | 동작 | 근거 |
|---|---|---|
| 최대 발급 수 | `cap ÷ amount`, 나누어떨어지지 않으면 내림 (예: 300,000 ÷ 3,000 = 100장, 100,000 ÷ 3,000 = 33장) | M2 요약 "100장 (300,000 ÷ 3,000)", 모의 API `qtyTotalOf` (`Math.floor`) |
| 최소 주문 = 할인 금액 | 허용 | 모의 API `saveTerms` (`minOrder < value`만 거절), M2 "할인 금액보다 작게 입력할 수 없어요" |
| 유효기간 시작 | 발급일 (구매 확정을 기다리는 동안에도 흐름). 확정 전에 지나면 확정 직후 만료 상태 | 모의 API `addDays(발급일, 30)`, M2 "받은 날부터 30일" |
| 구매 취소된 쿠폰 | 무효·소각, 그 가게 `issuedCount`를 되돌려 다른 손님에게 다시 나갈 수 있음 | 쓰일 수 없는 쿠폰이 한도를 차지하지 않게 |
| 잠긴 뒤 만료 | 그 결제는 확정할 수 있음 (잠글 때 유효기간을 이미 확인함) | KCP 미팅 확인 필요 3번 — 확정 허용 쪽 |
| 잠금 거절된 결제 ID | 결제를 차지하지 않음 → 같은 결제 ID로 다른 쿠폰 시도 가능 | 결제당 1장은 "잠긴·확정된 쿠폰 1장" 기준 |
| 같은 가게 다시 심사 | 거절 (`NotPending`) | 모의 API `reviewMerchant` |
| 승인 안 된 가게로 기획전 만들기 | 거절 (`NotApproved`) | K1 "승인된 가게만 연합 기획전에 참여" |
| 쿠폰이 안 나가는 주문 | 주문 번호는 기록됨 → 같은 번호로 다시 부르면 `OrderAlreadyIssued` | 새로고침·재요청 방지 (④ 구현 체크) |
| 받는 주소 0, 주문·결제 ID 0 | 항상 거절 | 11/2 보안 점검 |
| 종료 시각이 지난 기획전 상태 변경 | 거절 (`InvalidStatus`) | K2 자동 종료, 11/4 코드 검증 |
| 배포 주소 | admin·operator 파라미터 필수 (기본값 없음) | 11/4 보안 점검 |
| 권한 구조 | KCP 지갑(`DEFAULT_ADMIN_ROLE`)이 백엔드 권한을 주고 회수할 수 있음 (백엔드 키 유출 시 `revokeRole`로 차단) | 11/2 보안 점검 |
| 구매 1건 가스 | 참여 가게 수에 비례. 3곳 약 67만, 20곳 약 515만 (블록 한도 1,200만) | `test/6-security.test.js` |
