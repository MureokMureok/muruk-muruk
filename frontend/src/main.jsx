import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/app.css'
import App from './App.jsx'
import { prepareLaunch } from './utils/startup.js'
import { initTheme } from './utils/theme.js'

// 다크 모드 설정 적용 (MY → 설정)
initTheme()

// 처음 실행이면 시작 화면과 첫 화면을 정한다 (로그인 안 했으면 로그인 화면으로)
prepareLaunch()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter: 주소(URL)에 따라 화면을 바꿔 주는 기능을 앱 전체에 켠다 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
