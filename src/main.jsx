import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TournamentProvider } from './data/TournamentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TournamentProvider>
      <App />
      <footer className="text-center text-sm text-[#445F8B] my-4">
        <img src="https://heronrobotics.vercel.app/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fheronlogo.b712bcb0.png&w=828&q=75"
          className="inline-block w-6 h-6 mx-2 mb-1"
        /> Heron Robotics, FTC 27621.

        &copy; 2025. All rights reserved.<br />Made with late nights and free time — <a className='underline' href="https://github.com/HeronRobotics/decode-scoring-analysis" target="_blank" rel="noopener noreferrer">Contribute on GitHub</a>!
      </footer>
    </TournamentProvider>
  </StrictMode>,
)
