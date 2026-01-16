function TextImportModal({ open, textInput, setTextInput, onImport, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-8 max-w-2xl w-11/12 border-2 border-[#445f8b]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl mb-5">Paste Match Text</h3>
        <p className="text-sm mb-4 text-[#666]">Paste match data below</p>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="https://heronscout.me/?p=..."
          className="w-full h-40 sm:h-32 p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none font-mono text-sm resize-none"
        />
        <div className="flex gap-4 justify-end mt-6">
          <button onClick={onImport} className="btn">
            Import
          </button>
          <button onClick={onClose} className="btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default TextImportModal;
