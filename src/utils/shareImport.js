// Shared helpers for importing matches/tournaments from pasted text.
// Supports:
// - Full URLs (with or without protocol) containing ?p= or ?mt=
// - Bare paste keys (the value of `p`)
//
// Intentionally does NOT depend on any React/runtime state.

function looksLikeHostishToken(token) {
  // Examples:
  // - heronscout.me/?p=abc
  // - localhost:5173/?p=abc
  // - 127.0.0.1:5173/?p=abc
  // - my.site/path?mt=...
  return (
    token.includes("localhost") ||
    token.includes("127.0.0.1") ||
    token.includes(".me") ||
    token.includes(".app") ||
    token.includes(".com") ||
    token.includes(".net") ||
    token.includes(".org") ||
    token.includes(".dev") ||
    token.includes(".io")
  );
}

export function tryParseUrlish(input) {
  const raw = (input || "").trim();
  if (!raw) return null;

  // Already an absolute URL
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      return new URL(raw);
    } catch {
      return null;
    }
  }

  // Allow users to paste `heronscout.me/...` or `localhost:5173/...` without protocol.
  if (looksLikeHostishToken(raw)) {
    try {
      return new URL(`https://${raw}`);
    } catch {
      // Try http as a fallback for local URLs.
      try {
        return new URL(`http://${raw}`);
      } catch {
        return null;
      }
    }
  }

  // Allow query-only pastes like `?p=abc` or `p=abc`
  if (raw.startsWith("?")) {
    try {
      return new URL(`https://example.invalid/${raw}`);
    } catch {
      return null;
    }
  }
  if (raw.startsWith("p=") || raw.startsWith("mt=")) {
    try {
      return new URL(`https://example.invalid/?${raw}`);
    } catch {
      return null;
    }
  }

  return null;
}

export function extractShareParams(input) {
  const raw = (input || "").trim();
  if (!raw) return { pasteKey: null, mt: null };

  const url = tryParseUrlish(raw);
  if (url) {
    return {
      pasteKey: url.searchParams.get("p"),
      mt: url.searchParams.get("mt"),
    };
  }

  // Treat a bare token as a paste key. We keep it intentionally permissive; callers
  // should decide whether to attempt paste fetch.
  return { pasteKey: raw, mt: null };
}

export function splitLines(raw) {
  return (raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
