import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App'

createRoot(document.getElementById('radice')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Rende l'app installabile e usabile offline. Se fallisce (browser vecchio,
// pagina aperta da file://) l'app funziona lo stesso, solo online.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
