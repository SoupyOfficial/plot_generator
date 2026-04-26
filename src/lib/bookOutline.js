// src/lib/bookOutline.js
//
// Book Outline — a 15-beat structural skeleton for one book.
//
// This is the layer between SeriesPlan (multi-book meta) and ArcPlan
// (chapter-level pacing). It uses Save-the-Cat as the default template
// because it maps cleanly onto progression-fantasy / LitRPG act structure
// and gives us measurable position markers (e.g. "midpoint must be at ~50%").
//
// Pure functions; no LLM, no DOM. Pipeline arrow: BookOutline = f(book, opts).

/**
 * @typedef {Object} BookBeat
 * @property {string}  id            stable id ("opening_image", "midpoint", …)
 * @property {string}  label         human-readable label
 * @property {number}  position      target position 0..1 inside the book
 * @property {string}  purpose       structural purpose
 * @property {string}  [summary]     authoring notes / planted intent
 * @property {string[]} [foreshadowToPlant]  ledger ids to plant here
 * @property {string[]} [foreshadowToPay]    ledger ids to pay here
 * @property {string}  [tierTarget]  expected protagonist tier at this beat
 *
 * @typedef {Object} BookOutline
 * @property {number}    bookIndex
 * @property {string}    template          "save-the-cat" | "four-act" | "hero-journey"
 * @property {string}    workingTitle
 * @property {BookBeat[]} beats
 * @property {string}    [openingTier]
 * @property {string}    [endTier]
 */

const SAVE_THE_CAT = [
  { id: "opening_image",     label: "Opening Image",        position: 0.00, purpose: "setup" },
  { id: "theme_stated",      label: "Theme Stated",         position: 0.05, purpose: "setup" },
  { id: "setup",             label: "Setup",                position: 0.10, purpose: "setup" },
  { id: "catalyst",          label: "Catalyst",             position: 0.12, purpose: "inciting" },
  { id: "debate",            label: "Debate",               position: 0.20, purpose: "debate" },
  { id: "break_into_two",    label: "Break into Two",       position: 0.25, purpose: "act_break" },
  { id: "b_story",           label: "B-Story",              position: 0.30, purpose: "subplot" },
  { id: "fun_and_games",     label: "Fun & Games (promise of premise)", position: 0.40, purpose: "escalate" },
  { id: "midpoint",          label: "Midpoint",             position: 0.50, purpose: "reversal" },
  { id: "bad_guys_close_in", label: "Bad Guys Close In",    position: 0.65, purpose: "escalate" },
  { id: "all_is_lost",       label: "All Is Lost",          position: 0.75, purpose: "low_point" },
  { id: "dark_night",        label: "Dark Night of the Soul", position: 0.80, purpose: "low_point" },
  { id: "break_into_three",  label: "Break into Three",     position: 0.85, purpose: "act_break" },
  { id: "finale",            label: "Finale",               position: 0.95, purpose: "climax" },
  { id: "final_image",       label: "Final Image",          position: 1.00, purpose: "resolve" },
];

const FOUR_ACT = [
  { id: "hook",        label: "Hook",         position: 0.00, purpose: "setup" },
  { id: "inciting",    label: "Inciting Incident", position: 0.10, purpose: "inciting" },
  { id: "first_pp",    label: "First Plot Point",  position: 0.25, purpose: "act_break" },
  { id: "rising_a",    label: "Rising Action A",   position: 0.35, purpose: "escalate" },
  { id: "midpoint",    label: "Midpoint",          position: 0.50, purpose: "reversal" },
  { id: "rising_b",    label: "Rising Action B",   position: 0.65, purpose: "escalate" },
  { id: "second_pp",   label: "Second Plot Point", position: 0.75, purpose: "act_break" },
  { id: "low_point",   label: "Low Point",         position: 0.80, purpose: "low_point" },
  { id: "climax",      label: "Climax",            position: 0.92, purpose: "climax" },
  { id: "resolution",  label: "Resolution",        position: 1.00, purpose: "resolve" },
];

const HERO_JOURNEY = [
  { id: "ordinary_world",   label: "Ordinary World",        position: 0.00, purpose: "setup" },
  { id: "call",             label: "Call to Adventure",     position: 0.10, purpose: "inciting" },
  { id: "refusal",          label: "Refusal of the Call",   position: 0.15, purpose: "debate" },
  { id: "mentor",           label: "Meeting the Mentor",    position: 0.20, purpose: "subplot" },
  { id: "threshold",        label: "Crossing the Threshold", position: 0.25, purpose: "act_break" },
  { id: "tests",            label: "Tests, Allies, Enemies", position: 0.40, purpose: "escalate" },
  { id: "approach",         label: "Approach to the Inmost Cave", position: 0.55, purpose: "escalate" },
  { id: "ordeal",           label: "Ordeal",                position: 0.65, purpose: "low_point" },
  { id: "reward",           label: "Reward",                position: 0.75, purpose: "reversal" },
  { id: "road_back",        label: "The Road Back",         position: 0.85, purpose: "act_break" },
  { id: "resurrection",     label: "Resurrection",          position: 0.92, purpose: "climax" },
  { id: "return",           label: "Return with the Elixir", position: 1.00, purpose: "resolve" },
];

const TEMPLATES = {
  "save-the-cat": SAVE_THE_CAT,
  "four-act": FOUR_ACT,
  "hero-journey": HERO_JOURNEY,
};

export const BOOK_TEMPLATES = Object.keys(TEMPLATES);

/**
 * Build a fresh book outline from a series book + template.
 *
 * @param {Object} args
 * @param {Object} args.book                a book entry from SeriesPlan
 * @param {string} [args.template]          "save-the-cat" (default)
 * @param {string} [args.openingTier]
 * @param {string} [args.endTier]
 * @returns {BookOutline}
 */
export function createBookOutline({
  book,
  template = "save-the-cat",
  openingTier,
  endTier,
} = {}) {
  if (!book || typeof book.index !== "number") {
    throw new Error("createBookOutline: book with numeric .index required");
  }
  const proto = TEMPLATES[template];
  if (!proto) throw new Error(`createBookOutline: unknown template "${template}"`);

  const beats = proto.map((b) => ({
    ...b,
    summary: "",
    foreshadowToPlant: [],
    foreshadowToPay: [],
  }));

  return {
    bookIndex: book.index,
    template,
    workingTitle: book.workingTitle || "",
    beats,
    openingTier: openingTier || "",
    endTier: endTier || book.endTier || "",
  };
}

/**
 * Update one beat by id, immutably.
 */
export function updateBookBeat(outline, beatId, patch) {
  return {
    ...outline,
    beats: (outline.beats || []).map((b) =>
      b.id === beatId ? { ...b, ...patch, id: b.id, position: b.position } : b
    ),
  };
}

/**
 * Pin foreshadow to a beat. Adds to plant/pay arrays with dedup.
 */
export function pinForeshadow(outline, beatId, foreshadowId, kind = "plant") {
  if (!["plant", "pay"].includes(kind)) {
    throw new Error(`pinForeshadow: kind must be "plant" or "pay", got "${kind}"`);
  }
  const key = kind === "plant" ? "foreshadowToPlant" : "foreshadowToPay";
  return {
    ...outline,
    beats: (outline.beats || []).map((b) => {
      if (b.id !== beatId) return b;
      const list = b[key] || [];
      if (list.includes(foreshadowId)) return b;
      return { ...b, [key]: [...list, foreshadowId] };
    }),
  };
}

/**
 * Validate a book outline. Returns array of warning strings.
 * Checks: position monotonic, ids unique, has act-break beats, has climax.
 */
export function validateBookOutline(outline) {
  const w = [];
  if (!outline || !Array.isArray(outline.beats)) {
    return ["outline-empty"];
  }
  const beats = outline.beats;
  if (beats.length < 4) w.push("too-few-beats (<4)");
  const ids = new Set();
  for (const b of beats) {
    if (ids.has(b.id)) w.push(`duplicate beat id: ${b.id}`);
    ids.add(b.id);
    if (typeof b.position !== "number" || b.position < 0 || b.position > 1) {
      w.push(`beat "${b.id}" position out of range`);
    }
  }
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].position < beats[i - 1].position) {
      w.push(`beats out of order at index ${i} (${beats[i].id})`);
    }
  }
  const purposes = new Set(beats.map((b) => b.purpose));
  if (!purposes.has("climax")) w.push("missing climax beat");
  if (!purposes.has("setup")) w.push("missing setup beat");
  if (!purposes.has("resolve")) w.push("missing resolve beat");
  return w;
}

/**
 * Project a beat position (0..1) onto a chapter number, given a chapter
 * count. Useful for "midpoint chapter ~= chapter 12 of 24".
 */
export function beatChapterIndex(position, chapterCount) {
  if (!Number.isFinite(position) || !Number.isFinite(chapterCount)) return null;
  if (chapterCount <= 0) return null;
  // position 0 -> chapter 1, position 1 -> chapter chapterCount
  return Math.max(1, Math.min(chapterCount, Math.round(position * (chapterCount - 1)) + 1));
}

/**
 * Distribute a beat list across a target chapter count, returning
 * [{ ...beat, chapter: number }]. Stable: ties resolve by beat order.
 */
export function projectOutlineToChapters(outline, chapterCount) {
  if (!outline || !Array.isArray(outline.beats)) return [];
  return outline.beats.map((b) => ({
    ...b,
    chapter: beatChapterIndex(b.position, chapterCount),
  }));
}
