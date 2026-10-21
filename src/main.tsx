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
import './engineering-integrations.css'
import './navigation-panel-v3.css'

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
