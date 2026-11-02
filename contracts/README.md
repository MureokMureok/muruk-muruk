# contracts

쿠폰 스마트컨트랙트 (ERC-1155, 양도 불가). 함수·흐름은 [`INTERFACE.md`](INTERFACE.md).

## 구현 범위 (MVP)
가맹점 등록·한도 등록 → 기획전 서명·규칙 잠금·승인 → 쿠폰 발행 → 구매 시 다른 가게 쿠폰 발급 → 사용 검증(소유·사용처·유효기간·최소 주문·미사용) → 소각 → 재사용 거절

## 도구 / 네트워크
- Hardhat 3 + ethers v6 + Mocha, Solidity 0.8.28, OpenZeppelin Contracts 5
- 네트워크: 로컬(Hardhat 내장). KCP 네트워크는 정보 전달받은 뒤 추가

## 폴더

```
contracts/
├─ contracts/              Solidity 코드
│  ├─ MurukCoupon.sol      쿠폰 컨트랙트 구현
│  └─ interfaces/          IMurukCoupon.sol (인터페이스 v1)
├─ ignition/modules/       배포 스크립트 (Hardhat Ignition)
├─ scripts/demo.js         시연 흐름 ①~⑧을 체인에 실행하고 tx·가스·이벤트 출력
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
npx hardhat ignition deploy ignition/modules/MurukCoupon.js --network localhost   # 터미널 2: 배포 → 주소 출력
```

- Ignition 기본값은 배포 계정이 KCP(ADMIN)·백엔드(OPERATOR) 역할을 모두 가짐. 지갑을 나누려면 파라미터 파일 사용:

  ```json
  { "MurukCouponModule": { "admin": "0xKCP지갑주소", "operator": "0x백엔드지갑주소" } }
  ```

  `npx hardhat ignition deploy ignition/modules/MurukCoupon.js --network localhost --parameters <파라미터 파일>.json`
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
await c.merchantOf(1n)                                   // 상태 조회
await ethers.provider.getTransactionReceipt("<tx 해시>")  // 거래 결과
await c.queryFilter(c.filters.CouponRedeemed())          // 이벤트 기록
```

- ABI: `artifacts/contracts/MurukCoupon.sol/MurukCoupon.json`
- ABI는 인터페이스가 아니라 `MurukCoupon.json`을 쓴다 (역할 상수 `ADMIN_ROLE`·`OPERATOR_ROLE`, `MAX_ACTIVE_ISSUANCES` 포함)
- 지금 설정은 로컬 체인만 있어서 `.env`를 읽지 않는다. KCP 네트워크를 추가할 때 `.env.example`의 변수(`RPC_URL`, `DEPLOYER_PRIVATE_KEY`)를 쓸 예정 (`.env`는 커밋 금지)
- Windows: PowerShell에서 `npx`가 실행 정책 때문에 막히면 `npx.cmd`로 실행. OneDrive 폴더 안에서는 설치가 느리거나 파일 잠김(EPERM)이 날 수 있음
