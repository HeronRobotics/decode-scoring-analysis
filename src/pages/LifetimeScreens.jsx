import { Plus, UploadSimple } from '@phosphor-icons/react'

function LifetimeUpload({ onImportTournament }) {
  return (
    <div className="bg-brand-bg border-2 border-brand-border p-6 mb-8">
      <h2 className="text-3xl mb-4">Upload</h2>
      <label className="btn">
        <Plus weight="bold" size={20} />
        Upload Tournament or Match
        <input type="file" accept=".json" multiple onChange={onImportTournament} className="hidden" />
      </label>
      <p className="text-sm text-brand-text mt-3">
        Upload all of your tournament and match JSON files here to see your lifetime statistics!
      </p>
    </div>
  )
}

function LifetimeEmptyState() {
  return (
    <div className="bg-brand-bg border-2 border-brand-border p-16 text-center">
      <UploadSimple size={64} weight="light" className="mx-auto mb-4 text-brand-accent" />
      <p className="text-xl">No uploads yet. Upload your first tournament or match and it'll show up here 👀</p>
    </div>
  )
}

export { LifetimeUpload, LifetimeEmptyState }