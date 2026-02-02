function ShareLinkRow({ label, onShare, onCopy, copied, shareLabel, copyLabel }) {
  return (
    <div className="mt-2 text-xs break-all flex flex-col sm:flex-row sm:items-center gap-2 text-brand-muted">
      <span className="font-semibold">{label}:</span>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onShare}
          className="btn !py-1 !px-3 text-sm justify-center"
        >
          {shareLabel}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="btn !py-1 !px-3 text-sm justify-center"
        >
          {copied ? <>Copied link!</> : <>{copyLabel}</>}
        </button>
      </div>
    </div>
  );
}

export default ShareLinkRow;
