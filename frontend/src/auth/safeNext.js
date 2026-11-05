// 로그인 뒤 돌아갈 주소는 이 앱 안의 주소만 허용한다
// 글자로만 검사하면 "/%09/evil.example"처럼 브라우저가 외부 주소로 읽는 값을 놓치므로 URL로 해석해서 비교한다
export function safeNext(next) {
  if (!next) return null
  try {
    const url = new URL(next, window.location.origin)
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : null
  } catch {
    return null
  }
}
