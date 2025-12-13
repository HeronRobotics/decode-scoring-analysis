function CycleModal({
  open,
  cycleData,
  setCycleData,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-8 max-w-lg w-11/12 border-2 border-[#445f8b]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl mb-5">Record Cycle</h3>
        <div className="flex flex-col gap-5 mb-6">
          <label className="flex flex-col gap-3 font-semibold">
            Total Balls:
            <div className="flex flex-col sm:flex-row gap-3">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  className={`flex-1 p-3 sm:p-4 text-base sm:text-lg border-2 font-semibold transition-colors ${
                    cycleData.total === num
                      ? "border-[#445f8b] bg-[#445f8b] text-white"
                      : "border-[#ddd] bg-white hover:border-[#445f8b]"
                  }`}
                  onClick={() =>
                    setCycleData({
                      ...cycleData,
                      total: num,
                      scored: Math.min(cycleData.scored, num),
                    })
                  }
                >
                  {num}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-3 font-semibold">
            Balls Scored:
            <div className="flex flex-col sm:flex-row gap-3">
              {[0, 1, 2, 3].map((i) => {
                const disabled = i > cycleData.total;
                const selected = cycleData.scored === i;
                const base =
                  "flex-1 p-3 sm:p-4 text-base sm:text-lg border-2 font-semibold transition-colors";
                const cls = selected
                  ? "border-[#445f8b] bg-[#445f8b] text-white"
                  : disabled
                  ? "border-[#eee] bg-[#f8f8f8] text-[#aaa] cursor-not-allowed opacity-60"
                  : "border-[#ddd] bg-white hover:border-[#445f8b]";
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    className={`${base} ${cls}`}
                    onClick={() => {
                      if (disabled) return;
                      setCycleData({ ...cycleData, scored: i });
                    }}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </label>
        </div>
        <div className="flex gap-4 justify-end">
          <button onClick={onConfirm} className="btn !px-6">
            Confirm
          </button>
          <button onClick={onClose} className="error-btn !px-4 !py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CycleModal;
