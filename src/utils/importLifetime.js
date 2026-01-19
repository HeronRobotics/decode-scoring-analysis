import { parseMatchText } from "./matchFormat";
import { readPaste } from "./pasteService";
import { splitLines, tryParseUrlish } from "./shareImport";

export async function parseLifetimeImportInput(raw) {
  const results = [];
  const trimmedRaw = (raw || "").trim();
  if (!trimmedRaw) return results;

  const lines = splitLines(trimmedRaw);

  // If the user pasted a single hmadv*/match-text line, parse it once.
  if (lines.length === 1) {
    try {
      const parsed = parseMatchText(lines[0]);
      if ((parsed.events || []).length) {
        results.push({
          events: parsed.events,
          notes: parsed.notes,
          startTime: parsed.startTime,
          duration: parsed.duration,
          teamNumber: parsed.teamNumber,
        });
      }
    } catch (e) {
      console.warn("Failed to parse lifetime import as single match text", e);
    }
  } else {
    // Multiple lines: treat each non-URL line as its own match-text candidate.
    for (const line of lines) {
      if (tryParseUrlish(line)) continue;
      try {
        const parsed = parseMatchText(line);
        if ((parsed.events || []).length) {
          results.push({
            events: parsed.events,
            notes: parsed.notes,
            startTime: parsed.startTime,
            duration: parsed.duration,
            teamNumber: parsed.teamNumber,
          });
        }
      } catch {
        // ignore
      }
    }
  }

  const tokens = trimmedRaw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    try {
      // First, allow raw JSON tokens that contain matches/events.
      if (token.startsWith("{")) {
        const data = JSON.parse(token);
        if (data && (data.matches || data.events)) {
          results.push(data);
        }
        continue;
      }

      // Support full URLs (with or without protocol) and query-only strings.
      let pasteKey = null;
      let mt = null;

      const url = tryParseUrlish(token);
      if (url) {
        pasteKey = url.searchParams.get("p");
        mt = url.searchParams.get("mt");
      } else if (
        token.startsWith("p=") ||
        token.startsWith("mt=") ||
        token.startsWith("?")
      ) {
        // Handle bare query snippets like "p=...", "mt=...", or "?p=...".
        try {
          const fakeUrl = new URL(
            token.startsWith("?")
              ? `https://example.invalid/${token}`
              : `https://example.invalid/?${token}`,
          );
          pasteKey = fakeUrl.searchParams.get("p");
          mt = fakeUrl.searchParams.get("mt");
        } catch {
          // ignore bad query tokens
        }
      } else {
        // As a last resort, treat a bare, key-like token as a paste key.
        // This avoids accidentally treating time stamps like "1:07.829;" as keys.
        const looksLikeBareKey =
          token.length == 10 && /^[A-Za-z0-9_-]+$/.test(token);

        if (looksLikeBareKey) {
          pasteKey = token;
        }
      }

      if (pasteKey) {
        try {
          const b64Payload = await readPaste(pasteKey);
          const decodedText = atob(b64Payload);
          const parsed = parseMatchText(decodedText);
          if ((parsed.events || []).length) {
            results.push({
              events: parsed.events,
              notes: parsed.notes,
              startTime: parsed.startTime,
              duration: parsed.duration,
              teamNumber: parsed.teamNumber,
            });
          }
        } catch (e) {
          console.warn("Failed to import match from paste key", e);
        }
        continue;
      }

      if (mt) {
        try {
          const decodedText = atob(decodeURIComponent(mt));
          const parsed = parseMatchText(decodedText);
          if ((parsed.events || []).length) {
            results.push({
              events: parsed.events,
              notes: parsed.notes,
              startTime: parsed.startTime,
              duration: parsed.duration,
              teamNumber: parsed.teamNumber,
            });
          }
        } catch (e) {
          console.warn("Failed to import match from mt param", e);
        }
        continue;
      }
    } catch {
      continue;
    }
  }

  // Deduplicate simple match entries (those with events) to avoid double-imports
  // when the same text is parsed via multiple paths.
  const deduped = [];
  const seen = new Set();

  for (const item of results) {
    // Keep tournament-style JSON containers as-is.
    if (item && Object.prototype.hasOwnProperty.call(item, "matches")) {
      deduped.push(item);
      continue;
    }

    const key = JSON.stringify({
      teamNumber: item.teamNumber || "",
      startTime: item.startTime ?? null,
      duration: item.duration ?? null,
      notes: item.notes || "",
      events: item.events || [],
    });

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped;
}
