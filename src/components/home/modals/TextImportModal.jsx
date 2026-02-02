function TextImportModal({ open, textInput, setTextInput, onImport, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-brand-bg flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card p-6 sm:p-8 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-2">Import from Links or Text</h3>
        <p className="text-sm mb-5 text-brand-muted">
          Paste match URLs or exported match data below. You can paste multiple
          links on separate lines.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-brand-muted mb-2">
            Match Data
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste URLs here, one per line:&#10;https://heronscout.me/?p=...&#10;https://heronscout.me/?p=..."
            className="w-full h-40 p-3 input font-mono text-sm rounded resize-y"
            autoFocus
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onImport}
            disabled={!textInput.trim()}
            className="btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Matches
          </button>
        </div>
      </div>
    </div>
  );
}

export default TextImportModal;
