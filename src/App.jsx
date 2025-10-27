import { useState, useEffect, useRef } from 'react'
import { Play, Record, DoorOpen, Stop, ArrowClockwise, DownloadSimple, UploadSimple, CricketIcon, ClipboardTextIcon, Calendar, ChartLine } from '@phosphor-icons/react'
import Timeline from './components/Timeline'
import Statistics from './components/Statistics'
import TournamentPage from './pages/TournamentPage'
import LifetimePage from './pages/LifetimePage'

function App() {
  const [matchStartTime, setMatchStartTime] = useState(null)
  const [timerDuration, setTimerDuration] = useState(null) // in seconds
  const [elapsedTime, setElapsedTime] = useState(0)
  const [events, setEvents] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [cycleData, setCycleData] = useState({ total: 1, scored: 0 })
  const [showTextImport, setShowTextImport] = useState(false)
  const [textInput, setTextInput] = useState('')
  const intervalRef = useRef(null)

  const [keyEntry, setKeyEntry] = useState({ total: null, scored: null })
  const [keyEntryVisible, setKeyEntryVisible] = useState(false)
  const [keyEntryExpiresAt, setKeyEntryExpiresAt] = useState(null)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const expireTimeoutRef = useRef(null)

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - matchStartTime
        setElapsedTime(elapsed)
        
        // Auto-stop when timer expires
        if (timerDuration && elapsed >= timerDuration * 1000) {
          setIsRecording(false)
          setElapsedTime(timerDuration * 1000)
        }
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording, matchStartTime, timerDuration])

  // Auto-cancel pending key entry on timeout
  useEffect(() => {
    if (expireTimeoutRef.current) {
      clearTimeout(expireTimeoutRef.current)
      expireTimeoutRef.current = null
    }
    if (keyEntryVisible && keyEntryExpiresAt) {
      const ms = Math.max(0, keyEntryExpiresAt - Date.now())
      expireTimeoutRef.current = setTimeout(() => {
        setKeyEntry({ total: null, scored: null })
        setKeyEntryVisible(false)
        setKeyEntryExpiresAt(null)
        setCooldownUntil(Date.now() + 5000)
      }, ms)
    }
    return () => {
      if (expireTimeoutRef.current) {
        clearTimeout(expireTimeoutRef.current)
        expireTimeoutRef.current = null
      }
    }
  }, [keyEntryVisible, keyEntryExpiresAt])

  // Keyboard controls: type total (1-3), type made (0-total), press Enter to confirm. Esc to cancel.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isRecording) return
      if (showCycleModal || showTextImport) return
      const ae = document.activeElement
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.getAttribute('contenteditable') === 'true')) return

      const now = Date.now()
      if (!keyEntryVisible) {
        // Quick gate record with 'G'
        if (e.key && e.key.toLowerCase() === 'g') {
          const event = { type: 'gate', timestamp: elapsedTime }
          setEvents((prev) => [...prev, event])
          e.preventDefault()
          return
        }
        if (cooldownUntil && now < cooldownUntil) return
        if (e.key >= '1' && e.key <= '3') {
          setKeyEntry({ total: parseInt(e.key, 10), scored: null })
          setKeyEntryVisible(true)
          setKeyEntryExpiresAt(now + 5000)
          e.preventDefault()
        }
        return
      }

      // When visible
      if (e.key === 'Escape') {
        setKeyEntry({ total: null, scored: null })
        setKeyEntryVisible(false)
        setKeyEntryExpiresAt(null)
        setCooldownUntil(Date.now() + 5000)
        e.preventDefault()
        return
      }

      if (e.key === 'Enter') {
        if (keyEntry.total != null && keyEntry.scored != null) {
          const event = {
            type: 'cycle',
            timestamp: elapsedTime,
            total: keyEntry.total,
            scored: keyEntry.scored
          }
          setEvents((prev) => [...prev, event])
          setKeyEntry({ total: null, scored: null })
          setKeyEntryVisible(false)
          setKeyEntryExpiresAt(null)
        }
        e.preventDefault()
        return
      }

      if (e.key >= '0' && e.key <= '9') {
        if (keyEntry.total != null) {
          const val = parseInt(e.key, 10)
          if (val <= keyEntry.total) {
            setKeyEntry((prev) => ({ ...prev, scored: val }))
            setKeyEntryExpiresAt(Date.now() + 5000)
          }
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isRecording, showCycleModal, showTextImport, keyEntryVisible, keyEntry, elapsedTime, cooldownUntil])

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const startMatch = (duration) => {
    const now = Date.now()
    setMatchStartTime(now)
    setTimerDuration(duration)
    setElapsedTime(0)
    setEvents([])
    setIsRecording(true)
  }

  const stopMatch = () => {
    setIsRecording(false)
  }

  const recordCycle = () => {
    if (!isRecording) return
    setShowCycleModal(true)
  }

  const confirmCycle = () => {
    const event = {
      type: 'cycle',
      timestamp: elapsedTime,
      total: cycleData.total,
      scored: cycleData.scored
    }
    setEvents([...events, event])
    setShowCycleModal(false)
    setCycleData({ total: 1, scored: 0 })
  }

  const recordGate = () => {
    if (!isRecording) return
    const event = {
      type: 'gate',
      timestamp: elapsedTime
    }
    setEvents([...events, event])
  }

  const exportMatch = () => {
    const data = {
      startTime: matchStartTime,
      duration: timerDuration,
      events: events
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `match-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseTextFormat = (text) => {
    // Parse text format like: 0:00; 1/2 at 0:10; gate at 1:00; ...
    const events = []
    const parts = text.split(';').map(s => s.trim()).filter(s => s)
    
    for (const part of parts) {
      if (part === '0:00') continue // Skip the initial timestamp
      
      if (part.includes('gate at')) {
        const timeMatch = part.match(/(\d+):(\d+)/)
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1])
          const seconds = parseInt(timeMatch[2])
          events.push({
            type: 'gate',
            timestamp: (minutes * 60 + seconds) * 1000
          })
        }
      } else {
        const cycleMatch = part.match(/(\d+)\/(\d+)\s+at\s+(\d+):(\d+)/)
        if (cycleMatch) {
          const scored = parseInt(cycleMatch[1])
          const total = parseInt(cycleMatch[2])
          const minutes = parseInt(cycleMatch[3])
          const seconds = parseInt(cycleMatch[4])
          events.push({
            type: 'cycle',
            timestamp: (minutes * 60 + seconds) * 1000,
            total: total,
            scored: scored
          })
        }
      }
    }
    
    return events
  }

  const importMatch = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        setMatchStartTime(data.startTime)
        setTimerDuration(data.duration)
        setEvents(data.events)
        setElapsedTime(data.events.length > 0 ? data.events[data.events.length - 1].timestamp : 0)
        setIsRecording(false)
      } catch {
        alert('Error loading match file. Please ensure it is a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const importFromText = () => {
    try {
      const parsedEvents = parseTextFormat(textInput)
      if (parsedEvents.length === 0) {
        alert('No valid match data found. Please check the format.')
        return
      }
      
      setMatchStartTime(Date.now())
      setTimerDuration(null)
      setEvents(parsedEvents)
      setElapsedTime(parsedEvents[parsedEvents.length - 1].timestamp)
      setIsRecording(false)
      setShowTextImport(false)
      setTextInput('')
    } catch {
      alert('Error parsing match data. Please check the format.')
    }
  }

  const formatMatchData = () => {
    if (events.length === 0) return 'No events recorded'
    
    let output = formatTime(0) + ';'
    events.forEach(event => {
      if (event.type === 'cycle') {
        output += ` ${event.scored}/${event.total} at ${formatTime(event.timestamp)};`
      } else if (event.type === 'gate') {
        output += ` gate at ${formatTime(event.timestamp)};`
      }
    })
    return output
  }

  const totalScored = events
    .filter(e => e.type === 'cycle')
    .reduce((sum, e) => sum + e.scored, 0)
    
  const totalBalls = events
    .filter(e => e.type === 'cycle')
    .reduce((sum, e) => sum + e.total, 0)

  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-12">
      <header className="text-center my-8">
        <h1 className="text-5xl font-bold">H.MAD</h1>
      </header>

      {!isRecording && matchStartTime === null && (
        <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center p-16">
          <h2 className="text-3xl mb-8 text-center">Start a New Match</h2>
          <div className="flex gap-5 justify-center mb-8 flex-wrap">
            <button
              onClick={() => startMatch(30)}
              className="btn !py-3 !bg-[#445f8b] !text-white !px-6"
            >
              <Play size={24} weight="fill" />
              0:30 Timer (Auto)
            </button>
            <button
              onClick={() => startMatch(120)}
              className="btn !py-3 !bg-[#445f8b] !text-white !px-6"
            >
              <Play size={24} weight="fill" />
              2:00 Timer (TeleOp)
            </button>
          </div>
          <button
            onClick={() => startMatch(null)}
            className="btn mb-12"
          >
            <Play size={24} weight="fill" />
            No Timer (Practice)
          </button>
          {/* "-- or --" text but replace "--" with a line */}
          <div className="flex gap-4 items-center mb-12">
            <hr className="w-12 grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">or</span>
            <hr className="grow w-12 border-t border-gray-300" />
          </div>

          <div className="flex gap-4">
            <label className="btn">
              <span className="flex items-center gap-2">
                <UploadSimple weight="bold" />
                Import JSON
              </span>
              <input type="file" accept=".json" onChange={importMatch} className="hidden" />
            </label>
            <button 
              onClick={() => setShowTextImport(true)}
              className="btn"
            >
              <span className="flex items-center gap-2">
                <ClipboardTextIcon weight="bold" />
                From Text
              </span>
            </button>
          </div>
        </div>
      )}

      {(isRecording || matchStartTime !== null) && (
        <>
          <div className="bg-white p-8 text-center mb-8 border-2 border-[#445f8b] flex flex-col items-center justify-center w-full gap-2">
            <h2 className="text-6xl font-mono">{formatTime(elapsedTime)}</h2>
            <div>
              Scored&nbsp;
              <span className='font-bold'>
                {totalScored}/{totalBalls}
              </span>
            </div>
          </div>

          <div className="flex gap-4 justify-center mb-8 flex-wrap">
            {isRecording ? (
              <>
                <button 
                  onClick={recordCycle}
                  className="px-8 py-4 text-lg border-2 border-[#445f8b] bg-[#445f8b] text-white hover:bg-white hover:text-[#2d3e5c] transition-colors font-semibold flex items-center gap-2"
                >
                  <Record size={24} weight="fill" />
                  Record Cycle
                </button>
                <button 
                  onClick={recordGate}
                  className="btn"
                >
                  <CricketIcon size={24} weight="bold" />
                  Gate Open
                </button>
                <button 
                  onClick={stopMatch}
                  className="error-btn"
                >
                  <Stop size={24} weight="fill" />
                  Stop Match
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMatchStartTime(null)
                  setEvents([])
                  setElapsedTime(0)
                }}
                className="btn !px-6 !py-3"
              >
                <ArrowClockwise size={24} weight="bold" />
                New Match
              </button>
            )}
          </div>

          <Timeline events={events} currentTime={elapsedTime} />
          
          {events.length > 0 && <Statistics events={events} />}

          {!isRecording && events.length > 0 && (
            <div className="bg-white p-8 mt-8 border-2 border-[#445f8b] flex flex-col justif-center items-center gap-6">
              <div>
                <h3 className="text-xl mb-3">Match Data:</h3>
                <p className="bg-[#f5f5f5] p-4 max-w-full font-mono text-sm leading-relaxed border-2 border-[#ddd]">{formatMatchData()}</p>
              </div>
              <div className='w-full flex justify-center items-center gap-6'>
                <p>
                  Send the above text to your friends or export to JSON for easier processing!
                </p>
                <button
                  onClick={exportMatch}
                  className='btn'
                >
                  <DownloadSimple size={20} weight="bold" />
                  Save JSON
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Keyboard entry popup */}
      {keyEntryVisible && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white border-2 border-[#445f8b] shadow p-4 min-w-64">
            <div className="text-sm text-[#666] mb-1">Quick Entry</div>
            <div className="text-lg font-semibold mb-2">
              Shot {keyEntry.total} balls; how many made?
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#666] text-sm">Made:</span>
              <span className="text-2xl font-mono">{keyEntry.scored ?? '_'}</span>
              <span className="text-sm text-[#999]">(0-{keyEntry.total})</span>
            </div>
            <div className="text-xs text-[#666]">Type a number, then press Enter. Esc to cancel.</div>
          </div>
        </div>
      )}

      {showCycleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCycleModal(false)}>
          <div className="bg-white p-8 max-w-lg w-11/12 border-2 border-[#445f8b]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl mb-5">Record Cycle</h3>
            <div className="flex flex-col gap-5 mb-6">
              <label className="flex flex-col gap-3 font-semibold">
                Total Balls:
                <div className="flex gap-3">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      className={`flex-1 p-4 text-lg border-2 font-semibold transition-colors ${
                        cycleData.total === num 
                          ? 'border-[#445f8b] bg-[#445f8b] text-white' 
                          : 'border-[#ddd] bg-white hover:border-[#445f8b]'
                      }`}
                      onClick={() => setCycleData({ ...cycleData, total: num, scored: Math.min(cycleData.scored, num) })}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-3 font-semibold">
                Balls Scored:
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map((i) => {
                    const disabled = i > cycleData.total
                    const selected = cycleData.scored === i
                    const base = 'flex-1 p-4 text-lg border-2 font-semibold transition-colors'
                    const cls = selected
                      ? 'border-[#445f8b] bg-[#445f8b] text-white'
                      : disabled
                        ? 'border-[#eee] bg-[#f8f8f8] text-[#aaa] cursor-not-allowed opacity-60'
                        : 'border-[#ddd] bg-white hover:border-[#445f8b]'
                    return (
                      <button
                        key={i}
                        disabled={disabled}
                        className={`${base} ${cls}`}
                        onClick={() => {
                          if (disabled) return
                          setCycleData({ ...cycleData, scored: i })
                        }}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
              </label>
            </div>
            <div className="flex gap-4 justify-end">
              <button
                onClick={confirmCycle}
                className="btn !px-6"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowCycleModal(false)}
                className="error-btn !px-4 !py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTextImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowTextImport(false)}>
          <div className="bg-white p-8 max-w-2xl w-11/12 border-2 border-[#445f8b]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl mb-5">Paste Match Text</h3>
            <p className="text-sm mb-4 text-[#666]">
              Paste match data below in the format: 0:00; 1/2 at 0:10; 1/2 at 0:20; gate at 1:30; ...
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="0:00; 1/2 at 0:10; 1/2 at 0:20; gate at 1:30; ..."
              className="w-full h-32 p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none font-mono text-sm resize-none"
            />
            <div className="flex gap-4 justify-end mt-6">
              <button
                onClick={importFromText}
                className="btn"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowTextImport(false)
                  setTextInput('')
                }}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MainApp() {
  const [currentPage, setCurrentPage] = useState('home')

  if (currentPage === 'tournament') {
    return <TournamentPage onBack={() => setCurrentPage('home')} />
  }

  if (currentPage === 'lifetime') {
    return <LifetimePage onBack={() => setCurrentPage('home')} />
  }

  return (
    <>
      {/* Navigation Bar */}
      <div className="bg-white border-b-2 border-[#445f8b]">
        <div className="max-w-7xl mx-auto px-5 py-4 flex gap-4">
          <button
            onClick={() => setCurrentPage('home')}
            className={`px-6 py-2 font-semibold transition-colors ${
              currentPage === 'home'
                ? 'bg-[#445f8b] text-white'
                : 'bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]'
            }`}
          >
            Match Tracker
          </button>
          <button
            onClick={() => setCurrentPage('tournament')}
            className="px-6 py-2 font-semibold bg-transparent text-[#445f8b] hover:bg-[#f0f5ff] transition-colors flex items-center gap-2"
          >
            <Calendar weight="bold" size={20} />
            Tournament
          </button>
          <button
            onClick={() => setCurrentPage('lifetime')}
            className="px-6 py-2 font-semibold bg-transparent text-[#445f8b] hover:bg-[#f0f5ff] transition-colors flex items-center gap-2"
          >
            <ChartLine weight="bold" size={20} />
            Lifetime
          </button>
        </div>
      </div>
      
      <App />
    </>
  )
}

export default MainApp
