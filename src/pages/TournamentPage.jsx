import { useState } from 'react'
import { ArrowLeft, UploadSimple, Calendar, FloppyDisk } from '@phosphor-icons/react'
import Statistics from '../components/Statistics'
import Timeline from '../components/Timeline'
import TournamentGraphs from '../components/TournamentGraphs'

function TournamentPage({ onBack }) {
  const [tournament, setTournament] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentDate, setTournamentDate] = useState('')
  const [uploadedMatches, setUploadedMatches] = useState([])

  const importTournament = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        setTournament(data)
        setSelectedMatch(0)
        setIsCreating(false)
      } catch {
        alert('Error loading tournament file. Please ensure it is a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const importMatchFiles = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    let loadedMatches = []
    let loadedCount = 0

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          loadedMatches.push(data)
          loadedCount++

          if (loadedCount === files.length) {
            setUploadedMatches(prev => [...prev, ...loadedMatches])
          }
        } catch {
          alert(`Error loading ${file.name}. Please ensure it is a valid JSON file.`)
          loadedCount++
        }
      }
      reader.readAsText(file)
    })
  }

  const createTournament = () => {
    if (!tournamentName.trim()) {
      alert('Please enter a tournament name')
      return
    }
    if (!tournamentDate) {
      alert('Please select a tournament date')
      return
    }
    if (uploadedMatches.length === 0) {
      alert('Please upload at least one match')
      return
    }

    const newTournament = {
      name: tournamentName,
      date: tournamentDate,
      matches: uploadedMatches
    }

    setTournament(newTournament)
    setSelectedMatch(0)
    setIsCreating(false)
  }

  const saveTournament = () => {
    if (!tournament) return

    const blob = new Blob([JSON.stringify(tournament, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tournament-${tournament.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isCreating) {
    return (
      <div className="min-h-screen p-5 max-w-7xl mx-auto">
        <div className="my-8 flex items-center justify-between">
          <h1 className="text-5xl font-bold">Create Tournament</h1>
          <button onClick={() => setIsCreating(false)} className="btn">
            <ArrowLeft size={20} weight="bold" />
            Cancel
          </button>
        </div>

        <div className="bg-white border-2 border-[#445f8b] p-8">
          <div className="space-y-6 mb-8">
            <div>
              <label className="block font-semibold mb-2">Tournament Name</label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g., Qualifier October 10th"
                className="w-full p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Tournament Date</label>
              <input
                type="date"
                value={tournamentDate}
                onChange={(e) => setTournamentDate(e.target.value)}
                className="w-full p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Upload Match Files ({uploadedMatches.length} uploaded)</label>
              <label className="btn !py-3">
                <UploadSimple weight="bold" size={20} />
                Upload Match JSON Files
                <input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={importMatchFiles}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedMatches.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Uploaded Matches:</h3>
                <div className="space-y-2">
                  {uploadedMatches.map((match, index) => {
                    const cycleEvents = match.events.filter(e => e.type === 'cycle')
                    const scored = cycleEvents.reduce((sum, e) => sum + e.scored, 0)
                    const total = cycleEvents.reduce((sum, e) => sum + e.total, 0)
                    return (
                      <div key={index} className="border-2 border-[#ddd] p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold">Match {index + 1}</span>
                          <span className="text-sm text-[#666] ml-4">
                            {scored}/{total} balls scored
                          </span>
                        </div>
                        <button
                          onClick={() => setUploadedMatches(prev => prev.filter((_, i) => i !== index))}
                          className="error-btn !py-1 !px-3 !text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={createTournament}
            className="btn !py-3 !bg-[#445f8b] !text-white !px-6"
          >
            <FloppyDisk weight="bold" size={20} />
            Create Tournament
          </button>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-12">
        <header className="text-center my-8">
          <h1 className="text-5xl font-bold">Tournament Analysis</h1>
        </header>

        <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center p-16 gap-6">
          <h2 className="text-3xl mb-4 text-center">Load or Create Tournament</h2>
          
          <button
            onClick={() => setIsCreating(true)}
            className="btn !py-3 !bg-[#445f8b] !text-white !px-6"
          >
            <Calendar weight="bold" size={24} />
            Create New Tournament
          </button>

          <div className="flex gap-4 items-center my-4">
            <hr className="w-12 grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">or</span>
            <hr className="grow w-12 border-t border-gray-300" />
          </div>

          <label className="btn !py-3">
            <span className="flex items-center gap-2">
              <UploadSimple weight="bold" size={24} />
              Load Existing Tournament
            </span>
            <input type="file" accept=".json" onChange={importTournament} className="hidden" />
          </label>

          <button onClick={onBack} className="btn mt-6">
            <ArrowLeft size={20} weight="bold" />
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const currentMatch = tournament.matches[selectedMatch]
  const allEvents = tournament.matches.flatMap(m => m.events)
  
  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto">
      <div className="my-8 flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold">{tournament.name}</h1>
          <p className="text-lg text-[#666] mt-2">{new Date(tournament.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={saveTournament} className="btn">
            <FloppyDisk size={20} weight="bold" />
            Save Tournament
          </button>
          <button onClick={onBack} className="btn">
            <ArrowLeft size={20} weight="bold" />
            Back
          </button>
        </div>
      </div>

      {/* Tournament-wide Statistics */}
      <div className="mb-64">
        <h2 className="text-3xl mb-5">Tournament Summary</h2>
        <TournamentGraphs events={allEvents} numMatches={tournament.matches.length} />
      </div>


    <div className='w-full flex flex-col items-start p-8 bg-[#f0f5fd]'>
        <h2 className='mb-8'>
            <span className="text-3xl mb-5">Match Details</span>
        </h2>
        <div className="w-full bg-white border-2 border-[#445f8b] p-6 mb-8">
            <h3 className="text-2xl mb-4">Select Match ({tournament.matches.length} total)</h3>
            <div className="flex gap-3 flex-wrap">
            {tournament.matches.map((_, index) => (
                <button
                key={index}
                onClick={() => setSelectedMatch(index)}
                className={`px-6 py-3 border-2 font-semibold transition-colors ${
                    selectedMatch === index
                    ? 'border-[#445f8b] bg-[#445f8b] text-white'
                    : 'border-[#ddd] bg-white hover:border-[#445f8b]'
                }`}
                >
                Match {index + 1}
                </button>
            ))}
            </div>
        </div>

        {/* Individual Match View */}
        <div className="w-full mb-8">
            <Statistics events={currentMatch.events} />
            <Timeline
                events={currentMatch.events} 
                currentTime={currentMatch.events[currentMatch.events.length - 1]?.timestamp || 0} 
            />
        </div>
        </div>
    </div>
  )
}

export default TournamentPage
