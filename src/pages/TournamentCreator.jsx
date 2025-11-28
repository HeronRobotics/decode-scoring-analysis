import { useState } from 'react'
import { ArrowLeft, UploadSimple, FloppyDisk, ClipboardTextIcon } from '@phosphor-icons/react'
import { logEvent } from 'firebase/analytics'
import { analytics } from '../firebase'
import { parseMatchText } from '../utils/matchFormat'

function TournamentCreator({ onCancel, onTournamentCreated }) {
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentDate, setTournamentDate] = useState('')
  const [uploadedMatches, setUploadedMatches] = useState([])
  const [showTextImport, setShowTextImport] = useState(false)
  const [textInput, setTextInput] = useState('')

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

  const importFromText = () => {
    try {
      // Split by newlines to handle multiple match codes
      const lines = textInput.split('\n').map(line => line.trim()).filter(line => line)
      
      if (lines.length === 0) {
        alert("No valid match data found. Please check the format.")
        return
      }

      const newMatches = []
      for (const line of lines) {
        const parsedData = parseMatchText(line)
        
        if (parsedData.events.length === 0) {
          continue // Skip invalid lines
        }

        const matchData = {
          startTime: parsedData.startTime || Date.now(),
          duration: parsedData.duration || null,
          teamNumber: parsedData.teamNumber,
          events: parsedData.events,
          notes: parsedData.notes || "",
        }
        
        newMatches.push(matchData)
      }

      if (newMatches.length === 0) {
        alert("No valid match data found. Please check the format.")
        return
      }

      setUploadedMatches(prev => [...prev, ...newMatches])
      setShowTextImport(false)
      setTextInput("")
      
      logEvent(analytics, 'import_matches_from_text', {
        numMatches: newMatches.length
      })
    } catch (e) {
      alert("Error parsing match data. Please check the format: " + e.message)
    }
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
            <div className="flex gap-3 flex-wrap">
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
              <button onClick={() => setShowTextImport(true)} className="btn py-3!">
                <ClipboardTextIcon weight="bold" size={20} />
                Paste Match Codes
              </button>
            </div>
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

      {showTextImport && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowTextImport(false)}
        >
          <div
            className="bg-white p-8 max-w-2xl w-11/12 border-2 border-[#445f8b]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-5">Paste Match Codes</h3>
            <p className="text-sm mb-4 text-[#666]">
              Paste one or more match codes below (one per line). Format: hmadv1/teamNum/...;; 0:00; 1/2 at 0:10; ...
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="hmadv1/1234/.../...;; 0:00; 1/2 at 0:10; 1/2 at 0:20; gate at 1:30; ..."
              className="w-full h-64 p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none font-mono text-sm resize-none"
            />
            <div className="flex gap-4 justify-end mt-6">
              <button onClick={importFromText} className="btn">
                Import
              </button>
              <button
                onClick={() => {
                  setShowTextImport(false)
                  setTextInput("")
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

export default TournamentCreator