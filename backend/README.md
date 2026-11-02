# backend

Spring Boot + JPA + MySQL. 쿠폰/기획전/가맹점/정산 API, 스마트컨트랙트 호출.

- 시연에서는 서버가 관리하는 지갑 계정으로 서명합니다. (키는 환경 변수로만 주입)
- 배포: AWS

## 로컬 세팅
1. JDK 21, Docker Desktop 설치
2. `backend/.env.example`을 `backend/.env`로 복사하고 비밀번호 채우기
3. `backend` 폴더에서 `docker compose up -d`
4. IntelliJ에서 `backend` 폴더를 열고 `MurukApplication` 실행
5. http://localhost:8080/actuator/health 가 UP이면 성공

※ 3306 포트 대신 3307을 사용합니다.
