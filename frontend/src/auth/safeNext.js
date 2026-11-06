// 로그인 뒤 돌아갈 주소는 이 앱 안의 주소만 허용한다
// 글자로만 검사하면 "/%09/evil.example"처럼 브라우저가 외부 주소로 읽는 값을 놓치므로 URL로 해석해서 비교한다
export function safeNext(next) {
  if (!next) return null
  try {
    const url = new URL(next, window.location.origin)
    // "/.//evil.example"은 같은 origin으로 풀리지만 경로가 //로 시작해 외부 주소가 된다
    if (url.origin !== window.location.origin || url.pathname.startsWith('//')) return null
    return url.pathname + url.search + url.hash
  } catch {
    return null
  }
}
