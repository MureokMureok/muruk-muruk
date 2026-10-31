import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter: 주소(URL)에 따라 화면을 바꿔 주는 기능을 앱 전체에 켠다 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
