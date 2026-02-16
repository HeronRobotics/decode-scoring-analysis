import { useEffect, useMemo, useState } from "react";

function EmailNotConfirmedToast({ email, onResend }) {
  const storageKey = useMemo(
    () => (email ? `email_not_confirmed_dismissed:${email}` : null),
    [email],
  );
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storageKey) return;
    try {
      setDismissed(sessionStorage.getItem(storageKey) === "1");
    } catch {
      // ignore
    }
  }, [storageKey]);

  if (!email || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  };

  const resend = async () => {
    setSending(true);
    setError("");
    setSent(false);
    try {
      const err = await onResend?.();
      if (err) {
        setError(err.message || "Failed to resend verification email.");
      } else {
        setSent(true);
      }
    } catch (e) {
      setError(e?.message || "Failed to resend verification email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-4 sm:right-4 z-50 w-[min(28rem,calc(100vw-1.5rem))]">
      <div className="bg-brand-surface border-2 border-brand-border shadow-lg p-4 w-full rounded-lg">
        <div className="text-sm font-semibold text-brand-main-text">
          Email not verified
        </div>
        <div className="text-xs text-brand-text mt-1">
          Saving matches won&apos;t work until you confirm <span className="font-semibold">{email}</span>.
        </div>

        {sent && (
          <div className="text-xs mt-2 text-brand-accent">
            Verification email sent. Check your inbox (and spam).
          </div>
        )}
        {error && <div className="text-xs mt-2 text-brand-danger">{error}</div>}

        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs px-3 py-1.5 border border-brand-border rounded hover: text-brand-text"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="btn !py-2 !px-3 !text-xs"
          >
            {sending ? "Sending..." : "Resend email"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailNotConfirmedToast;
