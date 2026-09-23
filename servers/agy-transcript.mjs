/**
 * Transcript parser for Antigravity CLI (agy).
 *
 * Reads JSONL from ~/.gemini/antigravity-cli/brain/<convoId>/.system_generated/logs/transcript_full.jsonl
 * and extracts standard turns: [{ role: "user" | "assistant", content: string }]
 */

export function extractUserPrompt(content = "") {
  if (!content) return "";
  const match = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (match) return match[1].trim();
  // Strip metadata tags if present
  return content.replace(/<[A-Z_]+>[\s\S]*?<\/[A-Z_]+>/g, "").trim() || content.trim();
}

export function parseAgyTranscript(rawJsonl = "") {
  if (!rawJsonl.trim()) return [];
  const lines = rawJsonl.trim().split("\n");
  const turns = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.source === "USER_EXPLICIT" && entry.type === "USER_INPUT") {
      const prompt = extractUserPrompt(entry.content || "");
      if (prompt) {
        turns.push({ role: "user", content: prompt });
      }
    } else if (entry.source === "MODEL") {
      if (typeof entry.content === "string" && entry.content.trim()) {
        turns.push({ role: "assistant", content: entry.content.trim() });
      }
    }
  }

  return turns;
}
