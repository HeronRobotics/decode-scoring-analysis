function KeyboardEntryToast({ visible, keyEntry }) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-20 sm:right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))]">
      <div className="card shadow-xl shadow-brand-shadow p-4 w-full">
        <div className="text-sm text-brand-text mb-1">Quick Entry</div>
        <div className="text-lg font-semibold mb-2">
          Shot {keyEntry.total} balls; how many scored?
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-brand-text text-sm">Scored:</span>
          <span className="text-2xl font-mono">{keyEntry.scored ?? "_"}</span>
          <span className="text-sm text-brand-text">(0-{keyEntry.total})</span>
        </div>
        <div className="text-xs text-brand-text">
          Type a number, then press Enter. Esc to cancel.
        </div>
      </div>
    </div>
  );
}

export default KeyboardEntryToast;
