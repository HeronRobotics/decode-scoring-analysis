import MatchTextBlock from "./MatchTextBlock";
import ShareLinkRow from "./ShareLinkRow";

function PhaseExportPanel({
  title,
  text,
  onCopyText,
  copiedText,
  copyTextLabel,
  shareRowLabel,
  onShareLink,
  onCopyLink,
  copiedLink,
  shareLabel,
  copyLinkLabel,
}) {
  return (
    <div>
      <MatchTextBlock
        title={title}
        text={text}
        onCopy={onCopyText}
        copied={copiedText}
        copyLabel={copyTextLabel}
      />
      <ShareLinkRow
        label={shareRowLabel}
        onShare={onShareLink}
        onCopy={onCopyLink}
        copied={copiedLink}
        shareLabel={shareLabel}
        copyLabel={copyLinkLabel}
      />
    </div>
  );
}

export default PhaseExportPanel;
