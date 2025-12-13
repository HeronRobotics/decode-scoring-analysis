import { DownloadSimple } from "@phosphor-icons/react";
import PhaseExportPanel from "./matchData/PhaseExportPanel";

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
}) {
  return (
    <div className="bg-white p-4 sm:p-8 mt-8 border-2 border-[#445f8b] flex flex-col justif-center items-center gap-6 w-full">
      <div className="w-full">
        <h3 className="text-xl mb-2">Match Data:</h3>
        <p className="mb-2">
          Export this Match as JSON so you can analyze it with Heron Scout
          later!
        </p>

        <PhaseExportPanel
          title={null}
          text={matchText}
          onCopyText={onCopyFullText}
          copiedText={copiedFull}
          copyTextLabel="Copy Text"
          shareRowLabel="Share URL"
          onShareLink={onShareFull}
          onCopyLink={onCopyFullUrl}
          copiedLink={copiedFullUrl}
          shareLabel="share link"
          copyLinkLabel="copy link"
        />

        {mode === "match" && (
          <div className="w-full mt-6 flex flex-col gap-4">
            <PhaseExportPanel
              title="Auto-only Text:"
              text={autoText}
              onCopyText={onCopyAutoText}
              copiedText={copiedAuto}
              copyTextLabel="Copy Auto Text"
              shareRowLabel="Auto URL"
              onShareLink={onShareAuto}
              onCopyLink={onCopyAutoUrl}
              copiedLink={copiedAutoUrl}
              shareLabel="share auto link"
              copyLinkLabel="copy auto link"
            />

            <PhaseExportPanel
              title="TeleOp-only Text:"
              text={teleopText}
              onCopyText={onCopyTeleopText}
              copiedText={copiedTeleop}
              copyTextLabel="Copy TeleOp Text"
              shareRowLabel="TeleOp URL"
              onShareLink={onShareTeleop}
              onCopyLink={onCopyTeleopUrl}
              copiedLink={copiedTeleopUrl}
              shareLabel="share teleop link"
              copyLinkLabel="copy teleop link"
            />
          </div>
        )}
      </div>

      <div className="w-full flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6">
        <p>
          Send the above text to your friends, or export as JSON to analyze it
          with Heron Scout later!
        </p>
        <button onClick={onExportJson} className="btn">
          <DownloadSimple size={20} weight="bold" />
          Save JSON
        </button>
      </div>
    </div>
  );
}

export default MatchDataPanel;
