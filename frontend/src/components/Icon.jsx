// 선 아이콘 모음 (가이드: 두께 1.8px, 둥근 끝). 사용: <Icon name="home" />
const PATHS = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M14.5 6.5v11" strokeDasharray="2 2.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.2-4 4.4-6 8-6s6.8 2 8 6" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  chev: <path d="m9 5 7 7-7 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5 10 17.5 19 7" />,
  alert: <path d="M12 6v8M12 18.5v.01" />,
  wifi: (
    <>
      <path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
      <path d="M3 3l18 18" />
    </>
  ),
  // 콘솔 왼쪽 메뉴
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  link: (
    <>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M8.7 10.6 15.3 7.4M8.7 13.4l6.6 3.2" />
    </>
  ),
  sliders: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
}

function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      {PATHS[name]}
    </svg>
  )
}

export default Icon
