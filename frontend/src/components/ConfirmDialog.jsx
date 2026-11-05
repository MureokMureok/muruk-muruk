// 앱 안 브라우저는 window.confirm을 띄우지 않고 바로 취소로 처리하므로 화면 안에 직접 그린다
function ConfirmDialog({ message, confirmLabel, danger = false, onConfirm, onCancel }) {
  return (
    <div className="confirm-back" role="dialog" aria-modal="true" aria-label={message} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="confirm-box">
        <p>{message}</p>
        <div className="confirm-btns">
          <button className="btn g" onClick={onCancel}>
            취소
          </button>
          <button className={`btn ${danger ? 'r' : ''}`} autoFocus onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
