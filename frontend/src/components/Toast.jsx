// 화면 낭독기는 이미 있던 안내 영역의 글자가 바뀔 때 읽는다. 영역이 글자와 함께 새로 생기면 놓칠 수 있어 영역은 항상 둔다
function Toast({ text }) {
  return (
    <div className="toast-live" role="status">
      {/* key: 문구가 바뀌면 새로 만들어 나타나는 애니메이션을 처음부터 다시 한다 */}
      {text && (
        <div key={text} className="toast">
          {text}
        </div>
      )}
    </div>
  )
}

export default Toast
