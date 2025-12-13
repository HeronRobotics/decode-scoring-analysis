function KeyboardEntryToast({ visible, keyEntry }) {
  if (!visible) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-4 sm:right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))]">
      <div className="bg-white border-2 border-[#445f8b] shadow p-4 w-full">
        <div className="text-sm text-[#666] mb-1">Quick Entry</div>
        <div className="text-lg font-semibold mb-2">
          Shot {keyEntry.total} balls; how many scored?
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#666] text-sm">Scored:</span>
          <span className="text-2xl font-mono">{keyEntry.scored ?? "_"}</span>
          <span className="text-sm text-[#999]">(0-{keyEntry.total})</span>
        </div>
        <div className="text-xs text-[#666]">
          Type a number, then press Enter. Esc to cancel.
        </div>
      </div>
    </div>
  );
}

export default KeyboardEntryToast;
