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
    <div className="space-y-2">
      <div className="space-y-1.5">
        {GRID_ROWS.map((row) => (
          <div key={row.attempted} className="flex items-center gap-1.5">
            <span className="text-xs text-brand-text w-12 sm:w-14 text-right pr-1 font-medium shrink-0">
              {row.attempted} ball{row.attempted > 1 ? "s" : ""}
            </span>
            <div className="flex gap-1.5 flex-1">
              {row.options.map((scored) => {
                const key = `${row.attempted}-${scored}`;
                const isFlashing = flashKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleTap(row.attempted, scored)}
                    className={`flex-1 min-h-[56px] rounded-lg border-2 font-bold text-base transition-all active:scale-95 ${
                      isFlashing
                        ? "bg-green-500 border-green-400 text-white scale-95"
                        : "border-brand-border bg-brand-surface text-brand-main-text hover:border-brand-accent active:bg-brand-accent active:text-over-accent"
                    }`}
                  >
                    <span className="text-lg font-mono">{scored}</span>
                    <span className="text-brand-text font-normal text-xs">
                      /{row.attempted}
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
          className="btn w-full py-2 text-sm flex items-center justify-center gap-2"
        >
          <ArrowCounterClockwise size={16} weight="bold" />
          Undo last
        </button>
      )}
    </div>
  );
}

export default QuickCycleGrid;
