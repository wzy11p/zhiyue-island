import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles/sketchbook-tokens.css'
import './styles/sketchbook-dashboard.css'
import './styles/sketchbook-quiz.css'
import './styles/tutor.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
