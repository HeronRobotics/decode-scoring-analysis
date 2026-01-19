import { useState } from "react";
import {
  Copy,
  Check,
  ShareNetwork,
  Link,
  FileText,
  CaretRight,
  Export,
  FloppyDisk,
} from "@phosphor-icons/react";

function ExportSection({
  title,
  subtitle,
  text,
  onCopyText,
  copiedText,
  onShareLink,
  onCopyLink,
  copiedLink,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="export-card">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h4 className="font-semibold text-[#2d3e5c] flex items-center gap-2">
            <FileText size={16} weight="duotone" className="text-[#445f8b]" />
            {title}
          </h4>
          {subtitle && <p className="text-xs text-[#888] mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#445f8b] hover:underline flex items-center gap-1"
        >
          {expanded ? "Hide" : "Show"} data
          <CaretRight
            size={12}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <pre className="bg-white p-3 mb-3 font-mono text-[10px] leading-relaxed border border-[#e5e7eb] rounded whitespace-pre-wrap break-words max-h-32 overflow-auto">
          {text}
        </pre>
      )}

      <div className="action-btn-group">
        <button onClick={onCopyLink} className="btn !py-2 !px-3 !text-xs">
          {copiedLink ? (
            <>
              <Check size={14} weight="bold" className="text-green-600" />
              Link copied!
            </>
          ) : (
            <>
              <Link size={14} weight="bold" />
              Copy Link
            </>
          )}
        </button>
        <button onClick={onCopyText} className="btn !py-2 !px-3 !text-xs">
          {copiedText ? (
            <>
              <Check size={14} weight="bold" className="text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} weight="bold" />
              Copy Text
            </>
          )}
        </button>
        <button onClick={onShareLink} className="btn !py-2 !px-3 !text-xs">
          <ShareNetwork size={14} weight="bold" />
          Share
        </button>
      </div>
    </div>
  );
}

function MatchDataPanel({
  mode,
  matchText,
  autoText,
  teleopText,
  onCopyFullText,
  copiedFull,
  onShareFull,
  onCopyFullUrl,
  copiedFullUrl,
  onCopyAutoText,
  copiedAuto,
  onShareAuto,
  onCopyAutoUrl,
  copiedAutoUrl,
  onCopyTeleopText,
  copiedTeleop,
  onShareTeleop,
  onCopyTeleopUrl,
  copiedTeleopUrl,
  onExportJson,
  onSaveToAccount,
  saveStatus,
}) {
  return (
    <div className="bg-white border-2 border-[#445f8b] overflow-hidden">
      <div className="bg-[#f8fafc] px-5 py-4 border-b border-[#e5e7eb]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Export size={24} weight="duotone" className="text-[#445f8b]" />
            <div>
              <h3 className="text-lg font-semibold text-[#445f8b]">Save & Share</h3>
              <p className="text-xs text-[#666]">Export your match data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportJson}
              className="btn !py-2.5 !px-4 !bg-[#445f8b] !text-white !border-[#445f8b] hover:!bg-[#2d3e5c]"
            >
              <FloppyDisk size={18} weight="bold" />
              Save JSON
            </button>
            {onSaveToAccount && (
              <button
                onClick={onSaveToAccount}
                className="btn !py-2.5 !px-4"
                disabled={saveStatus === "saving"}
              >
                <FloppyDisk size={18} weight="bold" />
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved"
                    : "Save to My Matches"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <ExportSection
          title="Full Match"
          subtitle="Complete match data with all events"
          text={matchText}
          onCopyText={onCopyFullText}
          copiedText={copiedFull}
          onShareLink={onShareFull}
          onCopyLink={onCopyFullUrl}
          copiedLink={copiedFullUrl}
        />

        {mode === "match" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#e5e7eb]">
            <ExportSection
              title="Auto Only"
              subtitle="Autonomous period (0:00-0:30)"
              text={autoText}
              onCopyText={onCopyAutoText}
              copiedText={copiedAuto}
              onShareLink={onShareAuto}
              onCopyLink={onCopyAutoUrl}
              copiedLink={copiedAutoUrl}
            />
            <ExportSection
              title="TeleOp Only"
              subtitle="TeleOp period (0:38-2:38)"
              text={teleopText}
              onCopyText={onCopyTeleopText}
              copiedText={copiedTeleop}
              onShareLink={onShareTeleop}
              onCopyLink={onCopyTeleopUrl}
              copiedLink={copiedTeleopUrl}
            />
          </div>
        )}

        <div className="text-xs text-[#888] pt-3 border-t border-[#e5e7eb]">
          <p>
            <strong>Tip:</strong> Save as JSON to import into Tournament Analysis or
            Lifetime Stats later. Share links let others view this match instantly.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MatchDataPanel;
