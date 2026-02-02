import { useMemo } from "react";
import { Check, X } from "@phosphor-icons/react";
import {
  getTargetPattern,
  calculateMotifMatches,
  normalizePattern,
} from "../../utils/scoring";


const motifColor = {
  "P": "text-[#9b59b6] bg-[#f4ecf7] border-[#9b59b6]/20",
  "G": "text-[#27ae60] bg-[#e6f4ea] border-[#27ae60]/20",
}

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
                      ? "border " + motifColor[char]
                      : "border border-brand-danger " + motifColor[inputChar]
                    : "bg-brand-muted/30 text-brand-muted border border-brand-muted"
                }`}
              >
                {inputChar || char}
              </span>
              <span className={`text-[10px] mt-0.5 ${hasInput ? "" : "italic"} ${hasInput ? (isMatch ? "text-brand-accent" : "text-brand-danger") : "text-brand-muted"}`}>
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
        className="w-full px-3 py-2 input font-mono text-sm uppercase tracking-wider disabled:bg-brand-bg disabled:cursor-not-allowed"
        maxLength={9}
      />
      {targetPattern && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-brand-text mb-1">
            <span>Target: {targetPattern}</span>
            <span className="flex items-center gap-1">
              {matches > 0 ? (
                <Check size={12} weight="bold" className="text-brand-accent" />
              ) : (
                <X size={12} weight="bold" className="text-brand-text" />
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
