import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './i18n'
import './styles.css'
import './navigation-motion.css'
import './design-refinement.css'
import './engineering-launchpad.css'
import './engineering-page-system.css'
import './navigation-panel-v3.css'
import './performance-motion.css'
import './quality-motion.css'
import './immersive-motion.css'
import './NeuralAiStudio.css'
import './spatial-ai-system.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const renderApp = () => root.render(
  <React.StrictMode>
    <LanguageProvider><BrowserRouter><App /></BrowserRouter></LanguageProvider>
  </React.StrictMode>,
)

// Load the homepage visual layer before mounting direct homepage visits to avoid a first-paint restyle.
if (window.location.pathname === '/') {
  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = '/premium-experience.v2.css'
  stylesheet.dataset.dreamexPremiumExperience = 'true'
  stylesheet.addEventListener('load', renderApp, { once: true })
  stylesheet.addEventListener('error', renderApp, { once: true })
  document.head.append(stylesheet)
} else {
  renderApp()
}


if (window.location.protocol === 'https:' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Progressive enhancement: the site remains fully usable if offline support cannot register.
    })
  })
}
