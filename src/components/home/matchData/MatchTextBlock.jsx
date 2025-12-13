import { Check, Copy } from "@phosphor-icons/react";

function MatchTextBlock({ title, text, onCopy, copied, copyLabel }) {
  return (
    <div>
      {title && <h4 className="text-lg mb-1">{title}</h4>}
      <pre className="bg-[#f5f5f5] p-3 max-w-full font-mono text-xs leading-relaxed border-2 border-[#ddd] whitespace-pre-wrap break-words overflow-x-auto">
        {text}
      </pre>
      <button onClick={onCopy} className="btn mt-2 !py-1 !px-3 text-sm">
        {copied ? (
          <>
            <Check size={16} weight="bold" />
            Copied!
          </>
        ) : (
          <>
            <Copy size={16} weight="bold" />
            {copyLabel}
          </>
        )}
      </button>
    </div>
  );
}

export default MatchTextBlock;
