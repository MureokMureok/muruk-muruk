// 앱의 첫 화면. 지금은 "프로젝트가 제대로 실행되는지" 확인용 임시 화면이다.
// 다음 작업(로그인 화면)에서 이 내용을 실제 화면으로 바꾼다.
function App() {
  return (
    <main
      style={{
        maxWidth: 420, // 휴대폰 화면 폭 기준
        margin: '0 auto',
        minHeight: '100vh',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <span style={{ color: 'var(--forest)', fontWeight: 900, fontSize: 24 }}>
        무럭무럭
      </span>
      <h1>개발 환경 준비 완료</h1>
      <p>React + Vite 프로젝트가 실행되고 있어요.</p>
      <button className="pill p-forest">버튼 모양 확인</button>
    </main>
  )
}

export default App
