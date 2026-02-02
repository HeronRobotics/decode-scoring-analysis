import { useState } from 'react'
import { ArrowLeft, UploadSimple, FloppyDisk, ClipboardTextIcon } from '@phosphor-icons/react'
import { logEvent } from 'firebase/analytics'
import { analytics } from '../firebase'
import { parseMatchText } from '../utils/matchFormat'
import { readPaste } from '../utils/pasteService'
import { extractShareParams, splitLines, tryParseUrlish } from '../utils/shareImport'

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

  const importFromText = async () => {
    try {
      // Split by newlines to handle multiple match codes
      const lines = splitLines(textInput)
      
      if (lines.length === 0) {
        alert("No valid match data found. Please check the format.")
        return
      }

      const newMatches = []
      for (const line of lines) {
        let parsedData = null

        // URLs (with or without scheme) and query-only strings like `?p=...`.
        if (tryParseUrlish(line)) {
          const { pasteKey, mt } = extractShareParams(line)
          try {
            if (pasteKey) {
              const b64Payload = await readPaste(pasteKey)
              const decodedText = atob(b64Payload)
              parsedData = parseMatchText(decodedText)
            } else if (mt) {
              const decodedText = atob(decodeURIComponent(mt))
              parsedData = parseMatchText(decodedText)
            }
          } catch (e) {
            console.warn('Failed to import match from URL', e)
          }
        } else {
          // Non-URL lines: try raw match text first.
          try {
            parsedData = parseMatchText(line)
          } catch {
            // If it isn't match text, treat it as a bare paste key.
            const { pasteKey } = extractShareParams(line)
            if (pasteKey) {
              try {
                const b64Payload = await readPaste(pasteKey)
                const decodedText = atob(b64Payload)
                parsedData = parseMatchText(decodedText)
              } catch (e) {
                console.warn('Failed to import match from paste key', e)
              }
            }
          }
        }

        if (!parsedData || !parsedData.events || parsedData.events.length === 0) {
          continue
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
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl sm:text-5xl font-bold">Create Tournament</h1>
        <button onClick={onCancel} className="btn w-full sm:w-auto justify-center">
          <ArrowLeft size={20} weight="bold" />
          Cancel
        </button>
      </div>

      <div className="bg-brand-bg border-2 border-brand-border p-4 sm:p-8">
        <div className="space-y-6 mb-8">
          <div>
            <label className="block font-semibold mb-2">Tournament Name</label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="e.g., Qualifier October 10th"
              className="w-full p-3 border-2 border-brand-border focus:border-brand-accent outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">Tournament Date</label>
            <input
              type="date"
              value={tournamentDate}
              onChange={(e) => setTournamentDate(e.target.value)}
              className="w-full p-3 border-2 border-brand-border focus:border-brand-accent outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">Upload Match Files ({uploadedMatches.length} uploaded)</label>
            <div className="flex gap-3 flex-wrap">
              <label className="btn py-3! w-full sm:w-auto justify-center">
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
              <button onClick={() => setShowTextImport(true)} className="btn py-3! w-full sm:w-auto justify-center">
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
                    <div key={index} className="border-2 border-brand-border p-3 flex justify-between items-center">
                      <div>
                        <span className="font-semibold">Match {index + 1} ({match.teamNumber || 'No Team'})</span>
                        <span className="text-sm text-brand-text ml-4">
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
          className="btn py-3! bg-brand-accent! text-brand-mainText! px-6! w-full sm:w-auto justify-center"
        >
          <FloppyDisk weight="bold" size={20} />
          Create Tournament
        </button>
      </div>

      {showTextImport && (
        <div
          className="fixed inset-0 bg-brand-bg flex items-center justify-center z-50"
          onClick={() => setShowTextImport(false)}
        >
          <div
            className="bg-brand-bg p-4 sm:p-8 max-w-2xl w-11/12 border-2 border-brand-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-5">Paste Match Codes</h3>
            <p className="text-sm mb-4 text-brand-text">
              Paste one or more match codes below (one per line). Format: hmadv2/teamNum/...;; 0:00.000; 1/2 at 0:10.123; ... (hmadv1 also supported)
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="hmadv2/1234/.../...;; 0:00.000; 1/2 at 0:10.123; 1/2 at 0:20.456; gate at 1:30.000; ..."
              className="w-full h-56 sm:h-64 p-3 border-2 border-brand-border focus:border-brand-accent outline-none font-mono text-sm resize-none"
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