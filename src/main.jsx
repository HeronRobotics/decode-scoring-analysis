import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <footer className="text-center text-sm text-[#445F8B] my-4">
      &copy; 2025 Heron Robotics, FTC 27621. All rights reserved.
    </footer>
  </StrictMode>,
)
