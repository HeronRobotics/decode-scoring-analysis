import { useState } from 'react'
import { ArrowLeft, UploadSimple, FloppyDisk } from '@phosphor-icons/react'
import { logEvent } from 'firebase/analytics'
import { analytics } from '../firebase'

function TournamentCreator({ onCancel, onTournamentCreated }) {
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentDate, setTournamentDate] = useState('')
  const [uploadedMatches, setUploadedMatches] = useState([])

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

    onTournamentCreated(newTournament)
    logEvent(analytics, 'create_tournament', {
      tournamentName: tournamentName,
      numMatches: uploadedMatches.length
    })
  }

  const removeMatch = (index) => {
    setUploadedMatches(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto">
      <div className="my-8 flex items-center justify-between">
        <h1 className="text-5xl font-bold">Create Tournament</h1>
        <button onClick={onCancel} className="btn">
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
            <label className="btn py-3!">
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
                        <span className="font-semibold">Match {index + 1} ({match.teamNumber || 'No Team'})</span>
                        <span className="text-sm text-[#666] ml-4">
                          {scored}/{total} balls scored
                        </span>
                      </div>
                      <button
                        onClick={() => removeMatch(index)}
                        className="error-btn py-1! px-3! text-sm!"
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
          className="btn py-3! bg-[#445f8b]! text-white! px-6!"
        >
          <FloppyDisk weight="bold" size={20} />
          Create Tournament
        </button>
      </div>
    </div>
  )
}

export default TournamentCreator