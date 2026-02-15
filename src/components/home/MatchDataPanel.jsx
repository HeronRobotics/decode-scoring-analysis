import { useState } from "react";
import {
  Check,
  ShareNetwork,
  FileJs,
  CaretDown,
  Download,
  FloppyDisk,
} from "@phosphor-icons/react";

function MatchDataPanel({
  mode,
  onShareFull,
  onShareAuto,
  onShareTeleop,
  onExportJson,
  onSaveToAccount,
  saveStatus,
  onCopyAutoText,
  copiedAuto,
  onCopyTeleopText,
  copiedTeleop,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
            <ShareNetwork size={20} weight="bold" className="text-brand-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-main-text">Export & Share</h3>
            <p className="text-xs text-brand-text">Save or share your match data</p>
          </div>
        </div>
      </div>

      {/* Primary Actions - What most users need */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <button
          onClick={onShareFull}
          className="button py-4 flex items-center justify-center gap-2"
        >
          <ShareNetwork size={20} weight="bold" />
          Share Match
        </button>

        {onSaveToAccount && (
          <button
            onClick={onSaveToAccount}
            disabled={saveStatus === "saving"}
            className="btn py-4 flex items-center justify-center gap-2"
          >
            <FloppyDisk size={20} weight="bold" />
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved ✓"
                : "Save to Account"}
          </button>
        )}

        {onExportJson && (
          <button
            onClick={onExportJson}
            className="btn py-4 flex items-center justify-center gap-2 sm:col-span-2"
          >
            <Download size={20} weight="bold" />
            Download JSON
          </button>
        )}
      </div>

      {/* Advanced Options - Collapsed by default */}
      {mode === "match" && (
        <div className="border-t border-brand-border pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-sm text-brand-text hover:text-brand-accent transition-colors"
          >
            <span className="font-medium">Advanced export options</span>
            <CaretDown
              size={16}
              weight="bold"
              className={`text-brand-accent transition-transform ${
                showAdvanced ? "" : "-rotate-90"
              }`}
            />
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-3">
              <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-brand-main-text">
                      Auto Period Only
                    </h4>
                    <p className="text-xs text-brand-text">First 30 seconds</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onShareAuto}
                    className="btn py-2 px-3 text-sm flex-1"
                  >
                    <ShareNetwork size={16} weight="bold" />
                    Share
                  </button>
                  <button
                    onClick={onCopyAutoText}
                    className="btn py-2 px-3 text-sm flex-1"
                  >
                    {copiedAuto ? (
                      <>
                        <Check size={16} weight="bold" />
                        Copied
                      </>
                    ) : (
                      <>
                        <FileJs size={16} weight="bold" />
                        Copy Text
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-brand-main-text">
                      TeleOp Period Only
                    </h4>
                    <p className="text-xs text-brand-text">After 38 seconds</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onShareTeleop}
                    className="btn py-2 px-3 text-sm flex-1"
                  >
                    <ShareNetwork size={16} weight="bold" />
                    Share
                  </button>
                  <button
                    onClick={onCopyTeleopText}
                    className="btn py-2 px-3 text-sm flex-1"
                  >
                    {copiedTeleop ? (
                      <>
                        <Check size={16} weight="bold" />
                        Copied
                      </>
                    ) : (
                      <>
                        <FileJs size={16} weight="bold" />
                        Copy Text
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-brand-border">
        <p className="text-xs text-brand-text leading-relaxed">
          <strong>Sharing</strong> creates a link anyone can view. <strong>Save to Account</strong> stores the match in your profile. <strong>JSON export</strong> is for importing into other tools.
        </p>
      </div>
    </div>
  );
}

export default MatchDataPanel;
