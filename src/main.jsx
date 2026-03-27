import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (typeof document !== 'undefined') {
  const blockGestureZoom = (event) => {
    event.preventDefault()
  }

  let lastTouchEnd = 0

  document.addEventListener('gesturestart', blockGestureZoom, { passive: false })
  document.addEventListener('gesturechange', blockGestureZoom, { passive: false })
  document.addEventListener('gestureend', blockGestureZoom, { passive: false })
  document.addEventListener('touchmove', (event) => {
    if (event.scale && event.scale !== 1) {
      event.preventDefault()
    }
  }, { passive: false })
  document.addEventListener('touchend', (event) => {
    const now = Date.now()
    if (now - lastTouchEnd < 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
