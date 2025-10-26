import { useState, useEffect, useRef } from 'react'
import { Play, Record, DoorOpen, Stop, ArrowClockwise, DownloadSimple, UploadSimple, CricketIcon, ClipboardTextIcon } from '@phosphor-icons/react'
import Timeline from './components/Timeline'
import Statistics from './components/Statistics'

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
              className="btn !py-4 !bg-[#445f8b] !text-white px-3"
            >
              <Play size={24} weight="fill" />
              0:30 Timer (Auto)
            </button>
            <button
              onClick={() => startMatch(120)}
              className="btn !py-4 !bg-[#445f8b] !text-white px-3"
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
                  {[...Array(cycleData.total + 1)].map((_, i) => (
                    <button
                      key={i}
                      className={`flex-1 p-4 text-lg border-2 font-semibold transition-colors ${
                        cycleData.scored === i 
                          ? 'border-[#445f8b] bg-[#445f8b] text-white'
                          : 'border-[#ddd] bg-white hover:border-[#445f8b]'
                      }`}
                      onClick={() => setCycleData({ ...cycleData, scored: i })}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <div className="flex gap-4 justify-end">
              <button
                onClick={confirmCycle}
                className="px-6 py-3 text-base border-2 border-[#4CAF50] bg-[#4CAF50] text-white hover:bg-white hover:text-[#2d3e5c] transition-colors font-semibold"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowCycleModal(false)}
                className="px-6 py-3 text-base border-2 border-[#f44336] bg-[#f44336] text-white hover:bg-white hover:text-[#2d3e5c] transition-colors font-semibold"
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

export default App
