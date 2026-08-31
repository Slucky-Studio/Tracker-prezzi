import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App'

createRoot(document.getElementById('radice')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
