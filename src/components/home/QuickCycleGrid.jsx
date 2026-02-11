import { useCallback, useRef, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";

const GRID_ROWS = [
  { attempted: 1, options: [0, 1] },
  { attempted: 2, options: [0, 1, 2] },
  { attempted: 3, options: [0, 1, 2, 3] },
];

function QuickCycleGrid({ onAddCycle, onUndo, eventCount }) {
  const [flashKey, setFlashKey] = useState(null);
  const flashTimeoutRef = useRef(null);

  const handleTap = useCallback(
    (total, scored) => {
      onAddCycle({ total, scored });

      const key = `${total}-${scored}`;
      setFlashKey(key);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashKey(null), 200);
    },
    [onAddCycle],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {GRID_ROWS.map((row) => (
          <div key={row.attempted} className="flex items-stretch gap-2">
            <div className="flex items-center justify-center min-w-[4rem] bg-brand-bg rounded-xl border border-brand-border px-3">
              <span className="text-sm font-bold text-brand-accent">
                {row.attempted} ball{row.attempted > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2 flex-1">
              {row.options.map((scored) => {
                const key = `${row.attempted}-${scored}`;
                const isFlashing = flashKey === key;
                const allScored = scored === row.attempted && scored > 0;
                return (
                  <button
                    key={key}
                    onClick={() => handleTap(row.attempted, scored)}
                    className={`flex-1 min-h-[64px] rounded-xl border-2 font-bold text-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isFlashing
                        ? "bg-green-500 border-green-400 text-white scale-95 shadow-lg"
                        : allScored
                          ? "border-brand-accent bg-brand-accentBg text-brand-accent hover:bg-brand-accent hover:text-over-accent active:scale-95"
                          : "border-brand-border bg-brand-surface text-brand-main-text hover:border-brand-accent hover:bg-brand-surfaceStrong active:scale-95"
                    }`}
                  >
                    <span className="text-2xl font-mono font-bold">{scored}</span>
                    <span className="text-xs font-normal text-brand-text">
                      scored
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {eventCount > 0 && (
        <button
          onClick={onUndo}
          className="btn w-full py-3 text-base flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
          Undo Last Entry
        </button>
      )}
    </div>
  );
}

export default QuickCycleGrid;
