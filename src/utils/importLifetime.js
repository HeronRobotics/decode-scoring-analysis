import { parseMatchText } from "./matchFormat";
import { readPaste } from "./pasteService";

export async function parseLifetimeImportInput(raw) {
  const results = [];
  if (!raw) return results;

  try {
    const parsed = parseMatchText(raw);
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
    console.warn("Failed to parse lifetime import as raw match text", e);
  }

  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    try {
      if (token.startsWith("http://") || token.startsWith("https://")) {
        const url = new URL(token);
        const pasteKey = url.searchParams.get("p");
        const mt = url.searchParams.get("mt");

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
      }

      if (token.startsWith("{")) {
        const data = JSON.parse(token);
        if (data && (data.matches || data.events)) {
          results.push(data);
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}
