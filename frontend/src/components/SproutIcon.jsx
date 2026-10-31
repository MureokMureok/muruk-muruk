// 무럭무럭 새싹 로고 아이콘 (목업의 i-sprout 그대로)
function SproutIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 21.5V11" strokeWidth="2.8" />
      <path d="M12 12.5C12 7.2 8.4 4 3 4c0 5.3 3.7 8.5 9 8.5Z" fill="currentColor" stroke="none" />
      <path d="M12 10.8c0-4.3 3-7 8-7 0 4.3-3 7-8 7Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default SproutIcon
