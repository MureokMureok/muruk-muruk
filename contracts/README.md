# contracts

쿠폰 스마트컨트랙트 (ERC-1155, 양도 불가). 함수·흐름은 [`INTERFACE.md`](INTERFACE.md).

## 구현 범위 (MVP)
가맹점 심사 → 기획전 만들기(최대 20곳) → 가게별 쿠폰 조건 등록(할인 한도) → 시작 승인·일시 중지·종료 → 구매 시 다른 가게 쿠폰 발급(확정 대기, 한도 소진 시 그 가게만 중단) → 구매 확정·취소(발급 락업) → 결제 시작 시 잠금 → 결제 확정 시 소각 / 취소 시 복원(사용 락업, 결제당 1장) → 재사용 거절 → 할인 부담 기록

범위 밖: 예치금·충전금(11/3 폐지), 가맹점 직접 발행, 구매·결제 확정 **후** 환불 시 쿠폰 처리, 실제 정산

## 도구 / 네트워크
- Hardhat 3 + ethers v6 + Mocha, Solidity 0.8.28, OpenZeppelin Contracts 5
- 네트워크: 로컬(Hardhat 내장), KCP 테스트넷 `kcp` (chainId 56357)

## 폴더

```
contracts/
├─ contracts/              Solidity 코드
│  ├─ MurukCoupon.sol      쿠폰 컨트랙트 구현
│  └─ interfaces/          IMurukCoupon.sol (인터페이스 v3)
├─ ignition/               배포 스크립트 (modules/) · 로컬용 파라미터 (parameters.local.json)
├─ scripts/demo.js         시연 8장면을 체인에 실행하고 tx·가스·이벤트 출력
├─ test/                   시나리오 테스트 (단계별 + 시연 흐름 전체)
├─ hardhat.config.js       Hardhat 설정
└─ INTERFACE.md            함수·흐름·화면 대응·백엔드 호출 규칙
```

## 실행 방법

Node.js 22 이상.

```bash
cd contracts
npm install          # 처음 한 번
npm run compile      # 컴파일 → artifacts/ (ABI는 여기서 백엔드가 가져감)
npm test             # 테스트
```

로컬 체인에 배포해서 백엔드 연동을 먼저 해 볼 때:

```bash
npx hardhat node                                                        # 터미널 1: 로컬 체인 (http://127.0.0.1:8545)
npx hardhat ignition deploy ignition/modules/MurukCoupon.js --network localhost --parameters ignition/parameters.local.json   # 터미널 2: 배포 → 주소 출력
```

- admin(KCP 지갑)·operator(백엔드 서버 지갑) 주소는 파라미터 파일로 꼭 넣는다 (기본값 없음 → 빠뜨리면 배포가 멈춤). `ignition/parameters.local.json`은 Hardhat 공개 연습용 계정 #0·#1 주소
- 실제 체인용 파라미터 파일 예:

  ```json
  { "MurukCouponModule": { "admin": "0xKCP지갑주소", "operator": "0x백엔드지갑주소" } }
  ```

- 노드를 껐다 켠 뒤 다시 배포할 때 "이미 배포됨"으로 나오면 `ignition/deployments/chain-31337/` 폴더를 지우고 다시 실행
- 실제 체인에 배포할 때는 KCP·백엔드 지갑 주소를 꼭 따로 지정 (`INTERFACE.md` 5절)

시연 흐름을 체인에 실제로 실행해 보기 (매번 새로 배포, 거래마다 tx·블록·가스·이벤트 출력):

```bash
npx hardhat run scripts/demo.js --network localhost   # 노드를 켠 상태에서. --network 빼면 임시 체인
```

배포된 컨트랙트·거래 직접 조회 (로컬 체인에는 스캔 사이트가 없어서 콘솔 사용, 한 줄씩 입력):

```js
// npx hardhat console --network localhost
const { ethers } = await network.getOrCreate()
const c = await ethers.getContractAt("MurukCoupon", "<컨트랙트 주소>")
await c.termOf(1n, 2n)                                   // 상태 조회 (기획전 1, 가게 2)
await ethers.provider.getTransactionReceipt("<tx 해시>")  // 거래 결과
await c.queryFilter(c.filters.CouponRedeemed())          // 이벤트 기록
```

- ABI: `artifacts/contracts/MurukCoupon.sol/MurukCoupon.json`
- ABI는 인터페이스가 아니라 `MurukCoupon.json`을 쓴다 (역할 상수 `ADMIN_ROLE`·`OPERATOR_ROLE`, `VALID_DAYS`, `MAX_CAMPAIGN_MERCHANTS` 포함)
- KCP 테스트넷(chainId 56357)은 네트워크 이름 `kcp`로 등록되어 있다. `.env.example`을 복사해 `.env`에 `RPC_URL`, `DEPLOYER_PRIVATE_KEY`를 넣고 `--network kcp`로 실행 (`.env`는 커밋 금지, 값은 담당자에게 따로 받기). `.env`가 없어도 로컬 테스트는 그대로 돈다
- Windows: PowerShell에서 `npx`가 실행 정책 때문에 막히면 `npx.cmd`로 실행. OneDrive 폴더 안에서는 설치가 느리거나 파일 잠김(EPERM)이 날 수 있음
