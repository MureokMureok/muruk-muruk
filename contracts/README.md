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
│  └─ interfaces/          IMurukCoupon.sol (인터페이스 v1)
├─ test/                   테스트
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

- 배포용 RPC 주소·키는 `.env.example`을 복사해 `.env`로 만들고 채움 (`.env`는 커밋 금지)
