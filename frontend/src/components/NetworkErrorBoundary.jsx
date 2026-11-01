import { Component } from 'react'
import { Link } from 'react-router-dom'
import { setSimulation } from '../api/api.js'
import StatusView from './StatusView.jsx'
import TabBar from './TabBar.jsx'

// 공통 네트워크·서버 오류 화면 (소비자 와이어프레임 v0 · 상태 화면)
// 안쪽 화면에서 데이터를 못 불러오면(useApi가 에러를 던지면) 이 화면으로 바꿔 보여준다.
// - resetKey(지금 주소)가 바뀌면 = 다른 화면으로 이동하면 오류 표시를 지운다
// - "다시 불러오기"를 누르면 안쪽 화면을 처음부터 다시 그려서 데이터를 다시 받는다
//
// Error Boundary는 React에서 class로만 만들 수 있다 (C++의 try-catch를 화면 단위로 거는 것과 비슷)
class NetworkErrorBoundary extends Component {
  state = { error: null, attempt: 0, key: this.props.resetKey }

  // 안쪽에서 에러가 나면 React가 불러줌 → 오류 화면으로 전환
  static getDerivedStateFromError(error) {
    return { error }
  }

  // 주소가 바뀌면(다른 화면으로 이동) 오류 표시를 지움
  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.key) return { key: props.resetKey, error: null }
    return null
  }

  retry = () => {
    // 시연용 연결 오류를 끄고(실제 백엔드에서는 할 일 없음)
    setSimulation('')
    // attempt를 바꾸면 안쪽 화면이 새로 만들어져 데이터를 다시 불러옴
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))
  }

  render() {
    if (!this.state.error) {
      return <div key={this.state.attempt}>{this.props.children}</div>
    }
    return (
      <div className="phone-app">
        <main className="app-body">
          <StatusView kind="warn" title="연결이 불안정해요" desc="네트워크 상태를 확인하고 다시 시도해 주세요" />
          <button className="pill lg p-forest full" onClick={this.retry}>
            다시 불러오기
          </button>
          <Link className="text-link center" to="/home">
            홈으로
          </Link>
          {this.state.error.code !== 'NETWORK' && <p className="tiny center">오류 내용: {this.state.error.message}</p>}
        </main>
        <TabBar />
      </div>
    )
  }
}

export default NetworkErrorBoundary
