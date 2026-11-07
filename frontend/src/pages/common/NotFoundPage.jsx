import { Link } from 'react-router-dom'

// 없는 주소로 들어왔을 때 (모든 역할 공통)
// 예전에는 시작 주소로 바로 보냈지만, 역할 브랜치가 나뉜 뒤에는 해당 화면이 없는 브랜치도 있어서
// 무한히 이동하지 않도록 안내 화면을 보여준다
function NotFoundPage() {
  return (
    <div className="phone-app">
      <main className="ct notfound">
        <span className="cap">404</span>
        <h1 className="ttl-l">화면을 찾을 수 없어요</h1>
        <p>주소가 바뀌었거나 없는 화면이에요.</p>
        <Link className="btn" to="/login">
          로그인 화면으로
        </Link>
      </main>
    </div>
  )
}

export default NotFoundPage
