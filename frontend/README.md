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
