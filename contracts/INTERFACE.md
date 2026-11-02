# 쿠폰 컨트랙트 인터페이스 v1

- 코드: [`contracts/interfaces/IMurukCoupon.sol`](contracts/interfaces/IMurukCoupon.sol)
- 기준 자료: 프론트 모의 API(`frontend/src/api/api.js`, `seed.js`, PR #1) · `docs/mvp-spec.md` MVP 목록 · 소비자 와이어프레임 v0 · 11/1 팀 확정 사항
- 상태: 구현 완료 — [`contracts/MurukCoupon.sol`](contracts/MurukCoupon.sol), 테스트 `test/` (시연 흐름 전체 포함)

## 1. 기본 전제

| 항목 | 내용 |
|---|---|
| 표준 | ERC-1155. **쿠폰 1장 = tokenId 1개 (수량 1)**, tokenId는 1부터 증가 (`0` = 없음) |
| 양도 | 불가. 전송은 `TransferDisabled`로 막음 (발급·소각만) |
| 로그인·서명 | 소비자·가맹점·KCP 모두 구글 로그인 → **백엔드 서버 지갑이 대신 호출**. 소비자는 블록체인을 몰라도 됨 |
| 권한 | `ADMIN` = KCP 관리자 기능 / `OPERATOR` = 백엔드 (가맹점·소비자 요청 대행) |
| 가맹점 구분 | `merchantId`(번호). 지갑 주소 방식은 백엔드 확인 후 결정 — 바뀌어도 함수 입력만 바뀜 |
| 쿠폰 종류 | **정액권만** (할인액 = 쿠폰 금액) |
| 단위 | 금액 = 원(정수), 시각 = unix seconds, 유효기간 = 일수 |

## 2. 전체 흐름 (시연 8장면 순서)

```
① KCP     whitelistMerchant(가게)          가맹점 등록
          addLimit(가게, 500000, 입금ID)    입금액만큼 발행 한도 추가
          createCampaign(기획전, [가게3곳], 30)

② 가맹점   createIssuance(...)              직접 발행 쿠폰 (첫 구매 / 일정 금액 이상) — 한도에서 금액×수량 묶음

③ 가맹점   signCampaign(기획전, 가게, 할인액, 최소주문, 충전금)  — 한도에서 충전금 묶음
          (3곳 모두 서명) ──▶ 자동으로 규칙 잠금 (CampaignLocked)
   KCP     decideCampaign(기획전, 승인)     KCP는 승인·반려만, 규칙 수정 불가

④ 소비자 구매 → 백엔드 issueForPurchase(기획전, 구매가게, 소비자, 주문금액, 주문ID)
          → 나머지 2곳 기획전 쿠폰 + 조건 맞는 보너스 쿠폰 발급
          → 충전금 부족한 가게는 IssueSkipped (그 가게만 빠짐)

⑥ 소비자 사용 → 백엔드: 결제 승인 → redeem(쿠폰, 소비자, 사용가게, 주문금액, 주문ID)
          → 5가지 검사 통과 → 바로 소각 (CouponRedeemed)

⑦ 재사용 → redeem → AlreadyUsed로 거절 (RedeemRejected 기록, 쿠폰 상태 변화 없음)

⑧ 정산·체인 기록 → termOf().fundUsed / issuanceOf().usedAmount / 이벤트 조회
```

기획전 상태:

```
Signing ──(전원 서명)──▶ PendingApproval ──승인──▶ Active
                                         └─반려──▶ Rejected
```

쿠폰 상태:

```
Available ──redeem 성공──▶ Used (소각)
Available ──유효기간 지남──▶ Expired (조회 시 계산)
```

## 3. 예산(한도) 구조

```
가맹점 한도(limit) = 입금액 합계
 ├─ 기획전 충전금(fund) ── 서명 때 묶음
 │    ├─ fundReserved : 쿠폰 발급 때 할인액만큼 미리 확보
 │    └─ fundUsed     : 쿠폰 사용 때 실제 사용액 → 정산(가게 부담)
 ├─ 직접 발행분 = 할인액 × 수량 ── 발행 때 묶음
 └─ 남은 한도 = limit - reserved
```

- 기획전 쿠폰 발급 조건: `fund - fundReserved >= 할인액` (부족하면 그 가게만 건너뜀 = 쏠림 대응)
- 직접 발행 쿠폰 발급 조건: `issuedCount < qty`

## 4. 함수

### 쓰기

| 함수 | 누가 | 하는 일 | 실패하면 (에러) |
|---|---|---|---|
| `whitelistMerchant` | ADMIN | 가맹점 등록 | — |
| `addLimit` | ADMIN | 입금액만큼 한도 추가 | 미등록 가맹점 `NotWhitelisted`, 0원 `InvalidAmount` |
| `createCampaign` | ADMIN | 기획전 생성 (Signing) | 중복 `CampaignExists`, 미등록 가게 `NotWhitelisted`, 번호 0·빈 목록·유효기간 0·가게 중복 `InvalidAmount` |
| `signCampaign` | OPERATOR | 가게 조건 서명 + 충전금 확보, 전원 서명 시 잠금 | 없는 기획전 `CampaignNotFound`, 미참여 가게 `NotInCampaign`, 잠긴 뒤 `CampaignNotSigning`, 재서명 `AlreadySigned`, 할인액 0 `InvalidAmount`, 충전금 > 남은 한도 `LimitExceeded` |
| `decideCampaign` | ADMIN | 승인 / 반려 | 승인 대기 아님 `CampaignNotPending` |
| `createIssuance` | OPERATOR | 직접 발행 쿠폰 묶음 등록 | 할인액·수량·유효기간 0 `InvalidAmount`, 한도 0 `NoLimit`, 초과 `LimitExceeded` |
| `issueForPurchase` | OPERATOR | 구매 시 쿠폰 발급 | 같은 주문 재호출 `OrderAlreadyIssued` |
| `redeem` | OPERATOR | 5가지 검사 → 소각 | **되돌리지 않음** — `(false, reason, 0)` 반환 + `RedeemRejected` |

### 조회

| 함수 | 화면 |
|---|---|
| `check`, `checkAll` | ⑦ '사용하기' 활성, ⑧ 적용 가능 여부, ⑨-c 쿠폰 확인 결과 5항목 |
| `statusOf`, `couponOf`, `ownerOfCoupon` | ⑥ 쿠폰함 3탭, ⑦ 쿠폰 상세 |
| `merchantOf` | 가맹점 대시보드 (한도·남은 한도), KCP 입금·한도 |
| `campaignOf`, `termOf` | ② 기획전 상세, 가맹점 기획전 서명, KCP 기획전 승인, 정산 |
| `issuanceOf` | 가맹점 쿠폰 발행 내역, 정산 |
| `issuedFor` | ④-b 발급 확인 중 → 결과 조회 |
| `hasPurchased` | 첫 구매 보너스 판단 |

### 사용 거절 사유 (`Reason`) — ⑨-c 순서

| Reason | 검사 항목 | 모의 API code |
|---|---|---|
| `NotOwner` | 내 쿠폰인가 (없는 쿠폰 포함) | `NOT_OWNER` |
| `WrongMerchant` | 쓸 수 있는 가게인가 | `WRONG_MERCHANT` |
| `Expired` | 유효기간 안인가 | `EXPIRED` |
| `BelowMinOrder` | 최소 주문 금액 | `MIN_ORDER_NOT_MET` |
| `AlreadyUsed` | 아직 안 쓴 쿠폰인가 | `COUPON_ALREADY_USED` |

## 5. 백엔드가 지켜야 할 것

1. **결제 승인 후에 `redeem`을 호출**한다. 결제가 실패하면 `redeem`을 부르지 않으므로 쿠폰은 그대로 남는다 (⑨-d). 락업은 쓰지 않는다 (11/1 결정).
2. `redeem`은 거절해도 **트랜잭션은 성공**한다. 반환값 또는 `RedeemRejected` 이벤트를 꼭 확인한다.
3. 모든 구매에 대해 `issueForPurchase`를 부른다 (쿠폰이 없는 구매도). 그래야 첫 구매 판단(`hasPurchased`)이 맞는다.
4. `orderRef`, `depositRef`는 백엔드 ID를 `keccak256` 한 값. 개인정보를 넣지 않는다.
5. 응답이 늦으면 재호출하지 말고 `issuedFor` / `statusOf`로 먼저 조회한다 (E-04, E-05).

## 6. 모의 API와 다른 점 / 나중에 정할 것

| 항목 | 내용 |
|---|---|
| 만료 판정 | 모의 API는 날짜 단위(마지막 날까지), 컨트랙트는 `발급 시각 + 유효일수 × 24시간`. 화면 날짜 표시는 백엔드가 맞춰 준다 |
| 기획전 기간 | 모의 API처럼 날짜가 아니라 **상태(Active)** 로만 발급 여부 판단 |
| 만료 쿠폰의 확보 금액 | 모의 API와 같이 돌려주지 않음 (후속 결정) |
| 할인액 > 주문 금액 | 주문 금액까지만 할인 (모의 API `calcDiscount`와 같음). 충전금 사용액도 실제 할인액만큼 |
| 가맹점 구분 | `merchantId` 번호 — 백엔드 답변 후 확정 |
| 구매 취소 시 쿠폰 회수 | 범위 밖 (후속) |

## 7. 구현하면서 모의 API 기준으로 정한 것

팀 자료에 따로 정해지지 않은 부분은 프론트 모의 API(`api.js`)와 똑같이 동작하게 했다. 바꿔야 하면 알려 주세요.

| 항목 | 동작 | 근거 |
|---|---|---|
| 같은 가맹점 다시 등록 | 에러 없이 그대로 (이벤트만 다시 남음) | 모의 API `whitelistMerchant` |
| 같은 입금 ID로 한도 두 번 추가 | 막지 않음 (두 번 더해짐). 중복 방지는 백엔드에서 | 모의 API `registerLimit` |
| 서명 시 한도 0 | `NoLimit`이 아니라 `LimitExceeded` (충전금 > 남은 한도) | 모의 API `signCampaign` |
| 보너스 쿠폰 발급 때 묶음 유효기간 | 확인하지 않음 (받은 쿠폰이 바로 만료 상태일 수 있음) | 모의 API `couponsForPurchase` |
| 첫 구매 판단 | 이번 구매를 기록하기 전의 구매 이력 | 모의 API `couponsForPurchase` |
| 충전금 확보 | 발급 때 할인액만큼 `fundReserved`, 사용 때 실제 할인액만큼 `fundUsed` (만료 쿠폰 확보분은 돌려주지 않음) | 모의 API `purchase`, `redeemCoupon` |
| 만료 시각 | 발급 시각 + 유효일수 × 24시간까지 사용 가능 (그 시각 포함) | 6절 |
