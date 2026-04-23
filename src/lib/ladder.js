// src/lib/ladder.js
//
// Parse a progression-ladder preset (or custom rungs) into an ordered list,
// and describe where book 1 / book 3 pins sit on the ladder.
//
// The ladder editor lets the user drag two pins: end-of-book-1 and
// end-of-book-3. Their positions are stored as { book1Index, book3Index }
// in selections.progressionPins.

export const LADDER_PRESETS = {
  "Cultivation — 9 named realms": [
    "Body Tempering",
    "Foundation",
    "Core",
    "Nascent Soul",
    "Spirit Severing",
    "Dao Seeking",
    "Immortal",
    "Ascendant",
    "Transcendent",
  ],
  "LitRPG — numeric levels (1–100)": [
    "Level 1–10 (Initiate)",
    "Level 11–25 (Journeyman)",
    "Level 26–50 (Expert)",
    "Level 51–75 (Master)",
    "Level 76–99 (Grandmaster)",
    "Level 100 (Cap)",
  ],
  "Metal tiers — Bronze → Silver → Gold → Diamond → Legendary": [
    "Bronze",
    "Silver",
    "Gold",
    "Diamond",
    "Legendary",
  ],
  "Academy — year-based (Freshman → Senior → Graduate)": [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "Graduate",
    "Alumni",
  ],
};

/**
 * Parse "Foo → Bar, Baz → Qux" or comma/arrow-separated lists into rung array.
 */
export function parseCustomRungs(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/→|->|,|;|\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Given the selections object, return the active rung list (preset or custom).
 * Returns an array of strings. Empty if nothing selected.
 */
export function resolveRungs(selections) {
  const preset = selections?.progressionRungs;
  if (preset && LADDER_PRESETS[preset]) return LADDER_PRESETS[preset];
  const custom = parseCustomRungs(selections?.progressionCustomRungs || "");
  if (custom.length) return custom;
  // Custom option selected but no rungs yet.
  if ((preset || "").toLowerCase().includes("custom")) return [];
  return [];
}

/**
 * Normalize stored pins to valid indices within the current rung list.
 * Ensures book1 <= book3 and both in-bounds.
 */
export function normalizePins(pins, rungCount) {
  if (!rungCount) return null;
  let b1 = Number.isFinite(pins?.book1Index) ? pins.book1Index : Math.max(0, Math.floor(rungCount / 3) - 1);
  let b3 = Number.isFinite(pins?.book3Index) ? pins.book3Index : Math.max(b1, rungCount - 2);
  b1 = Math.max(0, Math.min(rungCount - 1, b1));
  b3 = Math.max(b1, Math.min(rungCount - 1, b3));
  return { book1Index: b1, book3Index: b3 };
}

/**
 * Render the pin positions as a prompt-friendly line.
 */
export function describePins(rungs, pins) {
  if (!Array.isArray(rungs) || !rungs.length || !pins) return "";
  const { book1Index, book3Index } = pins;
  const b1 = rungs[book1Index];
  const b3 = rungs[book3Index];
  if (!b1 && !b3) return "";
  const parts = [];
  if (b1) parts.push(`Book 1 ends at **${b1}** (rung ${book1Index + 1}/${rungs.length})`);
  if (b3 && b3 !== b1) parts.push(`Book 3 ends at **${b3}** (rung ${book3Index + 1}/${rungs.length})`);
  return parts.join(". ");
}
