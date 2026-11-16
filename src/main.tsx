import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './i18n'
import './styles.css'
import './navigation-motion.css'
import './design-refinement.css'
import './engineering-launchpad.css'
import './navigation-panel-v3.css'
import './performance-motion.css'
import './quality-motion.css'
import './immersive-motion.css'
import './spatial-ai-system.css'

// Attach the homepage visual layer synchronously without blocking React boot/hydration.
if (window.location.pathname === '/') {
  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = '/premium-experience.v2.css'
  stylesheet.dataset.dreamexPremiumExperience = 'true'
  document.head.append(stylesheet)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider><BrowserRouter><App /></BrowserRouter></LanguageProvider>
  </React.StrictMode>,
)

if (window.location.protocol === 'https:' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Progressive enhancement: the site remains fully usable if offline support cannot register.
    })
  })
}
