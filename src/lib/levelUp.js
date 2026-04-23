// src/lib/levelUp.js
//
// "Level up your seed": after a generation, ask the model for 3 concrete
// weak spots to fix. Each weak spot suggests a field to revisit. Fixing
// weak spots grants XP (tracked client-side in localStorage).

const XP_KEY = "plot_generator:xp";
const LEVEL_TABLE = [0, 50, 120, 220, 360, 560, 820, 1200, 1700, 2400];

export function readXp() {
  try {
    const n = parseInt(localStorage.getItem(XP_KEY) || "0", 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function writeXp(n) {
  try {
    localStorage.setItem(XP_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    /* ignore */
  }
}

export function addXp(delta) {
  const next = readXp() + delta;
  writeXp(next);
  return next;
}

export function levelFromXp(xp) {
  let lvl = 1;
  for (let i = 1; i < LEVEL_TABLE.length; i++) {
    if (xp >= LEVEL_TABLE[i]) lvl = i + 1;
  }
  const floor = LEVEL_TABLE[lvl - 1] ?? 0;
  const ceiling = LEVEL_TABLE[lvl] ?? floor + 1000;
  return {
    level: lvl,
    xp,
    floor,
    ceiling,
    progress: (xp - floor) / Math.max(1, ceiling - floor),
  };
}

// ============================================================================
// Weak-spots prompt
// ============================================================================

export function buildWeakSpotsPrompt({ brief, selections }) {
  const system = `You are a veteran progression-fantasy developmental editor.
Given a story seed and its structural selections, identify exactly THREE
weak spots — the concrete, fixable structural problems that would cost
the author review momentum. Each weak spot should:
  1. Be a specific structural issue, not prose-level feedback.
  2. Cite the field (by name) most responsible for the issue.
  3. Propose a targeted fix in one sentence.
Return strict JSON of the form:
{ "weakSpots": [ { "title": "...", "field": "...", "fix": "..." }, ... ] }
No prose, no markdown fences.`;
  const filledFields = Object.entries(selections || {})
    .filter(([, v]) => v && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("\n");
  const user = [
    "# STRUCTURED BRIEF",
    brief || "(no brief)",
    "",
    "# RAW SELECTIONS",
    filledFields || "(none)",
    "",
    "Return JSON now.",
  ].join("\n");
  return { system, user };
}

export function parseWeakSpotsResponse(text) {
  const cleaned = (text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed.weakSpots) ? parsed.weakSpots : [];
    return arr
      .filter((w) => w && typeof w === "object")
      .slice(0, 3)
      .map((w) => ({
        title: String(w.title || "Weak spot"),
        field: String(w.field || ""),
        fix: String(w.fix || ""),
      }));
  } catch {
    return [];
  }
}

export const XP_PER_WEAK_SPOT_FIXED = 25;
export const XP_PER_GENERATION = 10;
export const XP_PER_BANGER_COHERENCE = 40;
