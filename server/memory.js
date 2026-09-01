import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "sessions");
const MAX_HISTORY_MESSAGES = 40;
const REMEMBER_PATTERN = /^\s*\/remember\s+(.+)$|remember that (.+)$/i;

fs.mkdirSync(DATA_DIR, { recursive: true });

function sessionPath(sessionId) {
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DATA_DIR, `${safeId}.json`);
}

export function loadSession(sessionId) {
  const file = sessionPath(sessionId);
  if (!fs.existsSync(file)) {
    return { history: [], facts: [] };
  }
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    return { history: parsed.history ?? [], facts: parsed.facts ?? [] };
  } catch {
    return { history: [], facts: [] };
  }
}

export function saveSession(sessionId, session) {
  const trimmedHistory = session.history.slice(-MAX_HISTORY_MESSAGES);
  fs.writeFileSync(
    sessionPath(sessionId),
    JSON.stringify({ history: trimmedHistory, facts: session.facts }, null, 2),
  );
}

export function clearSession(sessionId) {
  const file = sessionPath(sessionId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/** Extract a "/remember ..." or "remember that ..." instruction, if present. */
export function extractFact(message) {
  const match = message.match(REMEMBER_PATTERN);
  if (!match) return null;
  return (match[1] ?? match[2] ?? "").trim();
}

export function factsToContext(facts) {
  if (!facts.length) return "";
  return (
    "\n\nKnown facts about this user (only mention if relevant):\n" +
    facts.map((f) => `- ${f}`).join("\n")
  );
}
