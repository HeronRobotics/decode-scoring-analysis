import { useEffect, useRef, useState } from "react";

export default function useKeyboardCycleEntry({
  enabled,
  blocked,
  elapsedTime,
  mode,
  phase,
  onAddCycle,
  onAddGate,
}) {
  const [keyEntry, setKeyEntry] = useState({ total: null, scored: null });
  const [keyEntryVisible, setKeyEntryVisible] = useState(false);
  const [keyEntryExpiresAt, setKeyEntryExpiresAt] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const expireTimeoutRef = useRef(null);

  useEffect(() => {
    if (expireTimeoutRef.current) {
      clearTimeout(expireTimeoutRef.current);
      expireTimeoutRef.current = null;
    }
    if (keyEntryVisible && keyEntryExpiresAt) {
      const ms = Math.max(0, keyEntryExpiresAt - Date.now());
      expireTimeoutRef.current = setTimeout(() => {
        setKeyEntry({ total: null, scored: null });
        setKeyEntryVisible(false);
        setKeyEntryExpiresAt(null);
        setCooldownUntil(Date.now() + 5000);
      }, ms);
    }
    return () => {
      if (expireTimeoutRef.current) {
        clearTimeout(expireTimeoutRef.current);
        expireTimeoutRef.current = null;
      }
    };
  }, [keyEntryVisible, keyEntryExpiresAt]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!enabled) return;
      if (blocked) return;

      const ae = document.activeElement;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      const now = Date.now();

      if (!keyEntryVisible) {
        if (e.key && e.key.toLowerCase() === "g") {
          onAddGate?.({ timestamp: elapsedTime, phase: mode === "match" ? phase : undefined });
          e.preventDefault();
          return;
        }
        if (cooldownUntil && now < cooldownUntil) return;
        if (e.key >= "1" && e.key <= "3") {
          setKeyEntry({ total: parseInt(e.key, 10), scored: null });
          setKeyEntryVisible(true);
          setKeyEntryExpiresAt(now + 5000);
          e.preventDefault();
        }
        return;
      }

      if (e.key === "Escape") {
        setKeyEntry({ total: null, scored: null });
        setKeyEntryVisible(false);
        setKeyEntryExpiresAt(null);
        setCooldownUntil(Date.now() + 5000);
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        if (keyEntry.total != null && keyEntry.scored != null) {
          onAddCycle?.({
            total: keyEntry.total,
            scored: keyEntry.scored,
            timestamp: elapsedTime,
            phase: mode === "match" ? phase : undefined,
          });
          setKeyEntry({ total: null, scored: null });
          setKeyEntryVisible(false);
          setKeyEntryExpiresAt(null);
        }
        e.preventDefault();
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        if (keyEntry.total != null) {
          const val = parseInt(e.key, 10);
          if (val <= keyEntry.total) {
            setKeyEntry((prev) => ({ ...prev, scored: val }));
            setKeyEntryExpiresAt(Date.now() + 5000);
          }
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    blocked,
    keyEntryVisible,
    keyEntry,
    elapsedTime,
    cooldownUntil,
    mode,
    phase,
    onAddCycle,
    onAddGate,
  ]);

  const clearKeyEntry = () => {
    setKeyEntry({ total: null, scored: null });
    setKeyEntryVisible(false);
    setKeyEntryExpiresAt(null);
  };

  return {
    keyEntry,
    keyEntryVisible,
    clearKeyEntry,
  };
}
