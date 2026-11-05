function Toast({ text }) {
  if (!text) return null
  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}

export default Toast
