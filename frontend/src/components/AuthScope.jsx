import { KCP_CAN, KCP_CANNOT } from '../utils/labels.js'

// KCP 권한 범위 상자 — KCP가 할 수 있는 일과 없는 일을 화면에 분명히 보여준다
function AuthScope() {
  return (
    <div className="auth-scope">
      <div className="card mint">
        <span className="cap">할 수 있는 일</span>
        <p>{KCP_CAN}</p>
      </div>
      <div className="card soft">
        <span className="cap">할 수 없는 일</span>
        <p>{KCP_CANNOT}</p>
      </div>
    </div>
  )
}

export default AuthScope
