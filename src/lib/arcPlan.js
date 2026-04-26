// src/lib/arcPlan.js
//
// Arc Plan — a book outline split into 3–5 arcs, each with an "engine"
// (the recurring scene-type that drives that arc), an escalation curve,
// and an estimated chapter count.
//
// Pipeline arrow: ArcPlan = f(BookOutline, opts).
// Pure functions; no LLM, no DOM.

/**
 * @typedef {Object} Arc
 * @property {number}   index            1-based
 * @property {string}   id               stable id
 * @property {string}   label
 * @property {string}   engine           "tournament" | "dungeon" | "heist" | "mystery" | "training" | "political" | "exploration" | "siege" | "free"
 * @property {string[]} beatIds          ids from the book outline this arc spans
 * @property {string}   tierStart
 * @property {string}   tierEnd
 * @property {number}   chapterCount     estimated chapters (>=1)
 * @property {string}   [premise]        one-line authoring note
 * @property {string[]} [escalationStops] e.g. ["round-of-16", "quarters", "semis", "final"]
 *
 * @typedef {Object} ArcPlan
 * @property {number} bookIndex
 * @property {Arc[]}  arcs
 * @property {number} totalChapters
 */

export const ARC_ENGINES = [
  "tournament",
  "dungeon",
  "heist",
  "mystery",
  "training",
  "political",
  "exploration",
  "siege",
  "free",
];

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `arc_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * Default arc partitioning by act-break beats. Falls back to even splits.
 *
 * @param {Object} args
 * @param {Object} args.outline           a BookOutline
 * @param {number} [args.totalChapters]   target total (default: 3 chapters per beat)
 * @param {number} [args.targetArcCount]  desired arc count (3..5; default 4)
 * @param {string[]} [args.engines]       per-arc engine override
 * @returns {ArcPlan}
 */
export function createArcPlan({
  outline,
  totalChapters,
  targetArcCount = 4,
  engines,
} = {}) {
  if (!outline || !Array.isArray(outline.beats)) {
    throw new Error("createArcPlan: outline with .beats required");
  }
  const beats = outline.beats;
  const total =
    typeof totalChapters === "number" && totalChapters > 0
      ? Math.floor(totalChapters)
      : Math.max(beats.length, beats.length * 2);

  const arcCount = Math.max(2, Math.min(6, Math.floor(targetArcCount)));

  // Partition beats by position into arcCount roughly-equal slices.
  const slices = partitionBeats(beats, arcCount);

  // Distribute totalChapters across arcs proportionally to each arc's
  // span of the position axis, with a minimum of 1 chapter per arc.
  const chapterCounts = distributeChapters(slices, total);

  const arcs = slices.map((slice, i) => {
    const first = slice[0];
    const last = slice[slice.length - 1];
    const engine =
      engines && engines[i] && ARC_ENGINES.includes(engines[i])
        ? engines[i]
        : "free";
    return {
      index: i + 1,
      id: nextId(),
      label: `Arc ${i + 1}: ${first.label} → ${last.label}`,
      engine,
      beatIds: slice.map((b) => b.id),
      tierStart: outline.openingTier || "",
      tierEnd: outline.endTier || "",
      chapterCount: chapterCounts[i],
      premise: "",
      escalationStops: defaultEscalationStops(engine, chapterCounts[i]),
    };
  });

  return {
    bookIndex: outline.bookIndex,
    arcs,
    totalChapters: chapterCounts.reduce((s, n) => s + n, 0),
  };
}

function partitionBeats(beats, arcCount) {
  // Split using position thresholds at i / arcCount, but keep at least one
  // beat per arc and never split mid-act-break.
  const thresholds = [];
  for (let i = 1; i < arcCount; i++) thresholds.push(i / arcCount);
  const slices = Array.from({ length: arcCount }, () => []);
  let cursor = 0;
  for (const b of beats) {
    while (cursor < thresholds.length && b.position > thresholds[cursor]) {
      cursor++;
    }
    slices[cursor].push(b);
  }
  // Fix empty trailing slices by stealing the last beat from the prior arc.
  for (let i = slices.length - 1; i > 0; i--) {
    if (slices[i].length === 0 && slices[i - 1].length > 1) {
      slices[i].unshift(slices[i - 1].pop());
    }
  }
  // Drop any still-empty slices at the end.
  return slices.filter((s) => s.length > 0);
}

function distributeChapters(slices, total) {
  // Weight each slice by its span on the position axis.
  const spans = slices.map((s) => {
    const lo = s[0].position;
    const hi = s[s.length - 1].position;
    return Math.max(0.05, hi - lo);
  });
  const sum = spans.reduce((a, b) => a + b, 0) || 1;
  let raw = spans.map((sp) => Math.max(1, Math.round((sp / sum) * total)));
  // Reconcile rounding so the sum equals total.
  let diff = total - raw.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0 && raw.length > 0) {
    const idx = i % raw.length;
    if (diff > 0) {
      raw[idx] += 1;
      diff -= 1;
    } else if (raw[idx] > 1) {
      raw[idx] -= 1;
      diff += 1;
    }
    i++;
    if (i > 1000) break;
  }
  return raw;
}

function defaultEscalationStops(engine, chapters) {
  switch (engine) {
    case "tournament":
      return chapters >= 8
        ? ["round-of-16", "quarters", "semis", "final"]
        : ["quarters", "semis", "final"];
    case "dungeon":
      return ["entry", "first-trap", "miniboss", "boss"];
    case "heist":
      return ["target", "crew", "rehearsal", "execution", "twist"];
    case "mystery":
      return ["body", "suspects", "red-herring", "reveal"];
    case "training":
      return ["plateau", "breakthrough", "test"];
    case "political":
      return ["alliance", "betrayal", "coup"];
    case "exploration":
      return ["frontier", "wonder", "danger", "discovery"];
    case "siege":
      return ["scout", "first-wave", "breach", "hold-or-fall"];
    default:
      return [];
  }
}

/**
 * Update one arc by id, immutably.
 */
export function updateArc(plan, arcId, patch) {
  return {
    ...plan,
    arcs: (plan.arcs || []).map((a) =>
      a.id === arcId
        ? { ...a, ...patch, id: a.id, index: a.index }
        : a
    ),
    totalChapters: recomputeTotal(plan.arcs, arcId, patch),
  };
}

function recomputeTotal(arcs, arcId, patch) {
  return (arcs || []).reduce((sum, a) => {
    const cc =
      a.id === arcId && typeof patch.chapterCount === "number"
        ? patch.chapterCount
        : a.chapterCount;
    return sum + (cc || 0);
  }, 0);
}

/**
 * Validate an arc plan. Returns array of warning strings.
 */
export function validateArcPlan(plan) {
  const w = [];
  if (!plan || !Array.isArray(plan.arcs)) return ["plan-empty"];
  if (plan.arcs.length < 2) w.push("too-few-arcs (<2)");
  if (plan.arcs.length > 6) w.push("too-many-arcs (>6)");
  const seenBeats = new Set();
  for (const a of plan.arcs) {
    if (!ARC_ENGINES.includes(a.engine)) {
      w.push(`arc ${a.index} has unknown engine "${a.engine}"`);
    }
    if (!Array.isArray(a.beatIds) || a.beatIds.length === 0) {
      w.push(`arc ${a.index} has no beats`);
    }
    if (!a.chapterCount || a.chapterCount < 1) {
      w.push(`arc ${a.index} has invalid chapterCount`);
    }
    for (const bid of a.beatIds || []) {
      if (seenBeats.has(bid)) w.push(`beat "${bid}" appears in multiple arcs`);
      seenBeats.add(bid);
    }
  }
  return w;
}

/**
 * Project the arc plan onto a contiguous chapter timeline:
 * returns [{ arcId, arcLabel, engine, chapter, beatId? }] for each chapter.
 */
export function projectArcsToChapters(plan, outline) {
  if (!plan || !Array.isArray(plan.arcs)) return [];
  const beatById = new Map(
    (outline?.beats || []).map((b) => [b.id, b])
  );
  const out = [];
  let chapter = 1;
  for (const arc of plan.arcs) {
    // Spread arc.beatIds proportionally across this arc's chapters.
    const n = arc.chapterCount;
    const beats = arc.beatIds.map((id) => beatById.get(id)).filter(Boolean);
    for (let i = 0; i < n; i++) {
      const t = beats.length > 0 ? Math.floor((i / n) * beats.length) : 0;
      out.push({
        arcId: arc.id,
        arcLabel: arc.label,
        engine: arc.engine,
        chapter,
        beatId: beats[t]?.id || null,
      });
      chapter++;
    }
  }
  return out;
}
