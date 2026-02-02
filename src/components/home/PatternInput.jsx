import { useMemo } from "react";
import { Check, X } from "@phosphor-icons/react";
import {
  getTargetPattern,
  calculateMotifMatches,
  normalizePattern,
} from "../../utils/scoring";


const motifColor = {
  "P": "text-[#d7b4ff] bg-[#2b1f39] border-[#8a63c8]/50",
  "G": "text-[#7ef0b0] bg-[#1e2f28] border-[#3adf8a]/50",
};

function PatternInput({ label, value, onChange, motif, disabled }) {
  const targetPattern = useMemo(() => getTargetPattern(motif), [motif]);
  const matches = useMemo(
    () => calculateMotifMatches(value || "", motif),
    [value, motif]
  );
  const points = matches * 2;

  const handleChange = (e) => {
    const normalized = normalizePattern(e.target.value).slice(0, 9);
    onChange(normalized);
  };

  const renderComparison = () => {
    if (!targetPattern || !value) return null;

    return (
      <div className="flex gap-0.5 mt-2 font-mono text-lg">
        {targetPattern.split("").map((char, i) => {
          const inputChar = (value || "")[i];
          const isMatch = inputChar && inputChar === char;
          const hasInput = inputChar !== undefined;

          return (
            <div key={i} className="flex flex-col items-center">
              <span
                className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold ${
                  hasInput
                    ? isMatch
                      ? " border " + motifColor[char]
                      : "border border-red-600  " + motifColor[inputChar]
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {inputChar || char}
              </span>
              <span className={`text-[10px] text-gray-400 mt-0.5 ${hasInput ? "" : "italic"} ${isMatch ? "text-green-600" : hasInput ? "text-red-600" : ""}`}>
                {char}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <label className="block text-sm font-semibold mb-1 text-brand-text">{label}</label>
      <input
        type="text"
        value={value || ""}
        onChange={handleChange}
        placeholder={disabled ? "Set motif first" : "Ex. PPGPP (from bottom to top)"}
        disabled={disabled}
        className="w-full px-3 py-2 input font-mono text-sm uppercase tracking-wider disabled:bg-brand-surfaceStrong/60 disabled:cursor-not-allowed"
        maxLength={9}
      />
      {targetPattern && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
            <span>Target: {targetPattern}</span>
            <span className="flex items-center gap-1">
              {matches > 0 ? (
                <Check size={12} weight="bold" className="text-brand-success" />
              ) : (
                <X size={12} weight="bold" className="text-brand-muted" />
              )}
              {matches}/9 matches = <strong className="text-brand-accent">{points} pts</strong>
            </span>
          </div>
          {renderComparison()}
        </div>
      )}
    </div>
  );
}

export default PatternInput;
