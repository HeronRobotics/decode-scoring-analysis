import { ArrowLeft, UploadSimple, Calendar } from '@phosphor-icons/react'

function TournamentLanding({ onCreateNew, onImportTournament, onBack }) {
  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-6 sm:gap-12">
      <header className="text-center my-6 sm:my-8 px-2">
        <h1 className="text-3xl sm:text-5xl font-bold">Tournament Analysis</h1>
      </header>

      <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center p-6 sm:p-16 gap-6 w-full">
        <h2 className="text-3xl text-center">Load or Create Tournament</h2>
        <p className='mb-4 text-center'>
          Scout teams at tournaments (or other multi-match events like scrimmages) and import them here!
          This will give you deeper insight into how well each team did across all matches, especially with regard to scoring and consistency.<br /><br />
          Creating "Tournament" JSON files will also make it very easy for you to keep track of your <i>own</i> performance over time on the Lifetime Stats page.
        </p>
        
        <button
          onClick={onCreateNew}
          className="btn !py-3 !bg-[#445f8b] !text-white !px-6"
        >
          <Calendar weight="bold" size={24} />
          Create New Tournament From Game Files
        </button>

        <div className="flex gap-4 items-center my-4">
          <hr className="w-12 grow border-t border-gray-300" />
          <span className="mx-2 text-gray-500">or</span>
          <hr className="grow w-12 border-t border-gray-300" />
        </div>

        <label className="btn !py-3">
          <span className="flex items-center gap-2">
            <UploadSimple weight="bold" size={24} />
            Load Existing Tournament JSON
          </span>
          <input type="file" accept=".json" onChange={onImportTournament} className="hidden" />
        </label>

        <button onClick={onBack} className="btn mt-6">
          <ArrowLeft size={20} weight="bold" />
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default TournamentLanding