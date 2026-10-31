# frontend

React 웹앱. 소비자(모바일 폭) / 가맹점 / KCP 관리자 화면.

- 배포: Vercel (루트 디렉터리를 `frontend/`로 지정)
- 시연용 목업 HTML이 기준 화면입니다. 목업의 화면·문구를 이식합니다.

React + Vite (JavaScript). Node.js 20.19 이상 필요.

## 실행 방법

```bash
cd frontend
npm install      # 처음 한 번 (패키지 설치)
npm run dev      # 개발 서버 → http://localhost:5173
```

- `npm run build`: 배포용 파일을 `dist/`에 만듦
- `npm run lint`: 코드 검사 (oxlint)
- 백엔드 주소는 `.env.example`을 복사해 `.env`로 만들고 `VITE_API_BASE_URL`을 채움

## 로그인 (현재: 모의 로그인)

백엔드 로그인 API 연결 전까지 `src/auth/mockAuth.js`의 가짜 로그인을 씁니다.

| 방법 | 결과 |
|---|---|
| 카카오·Google 버튼 | 소비자로 로그인 → `/home` |
| 아이디 `user` / `1234` | 소비자 → `/home` |
| 아이디 `store` / `1234` | 가맹점 → `/store` |
| 아이디 `kcp` / `1234` | KCP 관리자 → `/admin` |

- 로그인 안 한 상태로 `/store`, `/admin`, `/home`에 들어가면 로그인 화면으로 보내고, 로그인 후 원래 화면으로 돌아옵니다.
- 다른 역할의 화면 주소로 들어가면 자기 역할의 첫 화면으로 보냅니다.
