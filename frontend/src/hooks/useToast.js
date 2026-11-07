import { useEffect, useRef, useState } from 'react'

const TOAST_MS = 2500 // styles/app.css의 .toast 애니메이션 시간과 같은 값

export function useToast() {
  const [text, setText] = useState('')
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  function showToast(message) {
    clearTimeout(timer.current)
    setText(message)
    timer.current = setTimeout(() => setText(''), TOAST_MS)
  }
  return [text, showToast]
}
