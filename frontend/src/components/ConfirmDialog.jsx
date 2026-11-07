import { useEffect, useRef } from 'react'

// 앱 안 브라우저는 window.confirm을 띄우지 않고 바로 취소로 처리하므로 화면 안에 직접 그린다
// 기본 dialog를 써서 Tab이 창 안에 머물고, Esc와 닫은 뒤 포커스 복원을 브라우저가 처리한다
function ConfirmDialog({ message, confirmLabel, danger = false, onConfirm, onCancel }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  return (
    <dialog ref={dialog} className="confirm-box" aria-label={message} onCancel={onCancel}>
      <p>{message}</p>
      <div className="confirm-btns">
        <button className="btn g" onClick={onCancel}>
          취소
        </button>
        <button className={`btn ${danger ? 'r' : ''}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
