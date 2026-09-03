import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { seedIfEmpty } from './lib/seed'
import './styles/base.css'

// PWA: service worker ro'yxatga olish vite-plugin-pwa tomonidan index.html ga avtomatik qo'shiladi
// (injectRegister: 'auto', registerType: 'autoUpdate'). Single-file buildda PWA yo'q.

seedIfEmpty().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </HashRouter>
    </React.StrictMode>,
  )
})
