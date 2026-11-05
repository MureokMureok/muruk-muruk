import { Link } from 'react-router-dom'
import PhoneScreen from './PhoneScreen.jsx'
import StatusView from './StatusView.jsx'

// 주소에 해당하는 가게·쿠폰이 없을 때. 연결 오류와 구분해서 안내한다
function MissingScreen({ title, message, to, toLabel }) {
  return (
    <PhoneScreen
      title={title}
      foot={
        <Link className="btn" to={to}>
          {toLabel}
        </Link>
      }
    >
      <StatusView kind="search" title={message} desc="주소가 바뀌었거나 지금은 볼 수 없어요." />
    </PhoneScreen>
  )
}

export default MissingScreen
