import { Plus, UploadSimple } from '@phosphor-icons/react'

function LifetimeUpload({ onImportTournament }) {
  return (
    <div className="bg-white border-2 border-[#445f8b] p-6 mb-8">
      <h2 className="text-3xl mb-4">Upload</h2>
      <label className="btn">
        <Plus weight="bold" size={20} />
        Upload Tournament or Match
        <input type="file" accept=".json" onChange={onImportTournament} className="hidden" />
      </label>
      <p className="text-sm text-[#666] mt-3">
        Upload all of your tournament and match JSON files here to see your lifetime statistics!
      </p>
    </div>
  )
}

function LifetimeEmptyState() {
  return (
    <div className="bg-white border-2 border-[#445f8b] p-16 text-center">
      <UploadSimple size={64} weight="light" className="mx-auto mb-4 text-[#445f8b]" />
      <p className="text-xl">No uploads yet. Upload your first tournament or match and it'll show up here 👀</p>
    </div>
  )
}

export { LifetimeUpload, LifetimeEmptyState }