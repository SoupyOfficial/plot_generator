// src/lib/auditChapter.js
//
// Audit a single chapter (scaffold + prose) against the bible/series state.
// Pure function; no LLM, no DOM. Intended to be run before "ingest".
//
// Pipeline arrow: AuditReport = f(bible, scaffold, prose, prevFingerprint).
//
// The audit is deliberately conservative: it emits *warnings*, not errors.
// The author/UI decides what to enforce. Each subaudit returns an array of
// `{ kind, severity, message, ref? }` records so the cockpit can render them.

import { fingerprintProse, diffFingerprints } from "./voiceFingerprint.js";

/**
 * @typedef {{kind:string, severity:"info"|"warn"|"error", message:string, ref?:any}} Finding
 *
 * @typedef {Object} AuditReport
 * @property {Finding[]} continuity
 * @property {Finding[]} characterDrift
 * @property {Finding[]} foreshadow
 * @property {Finding[]} powerCurve
 * @property {Finding[]} castBloat
 * @property {Finding[]} voice
 * @property {Finding[]} promiseDebt
 * @property {number}    score    0..1, 1.0 = clean
 * @property {Object}    meta
 */

/**
 * Run all subaudits.
 *
 * @param {Object} args
 * @param {Object} args.bible
 * @param {Object} [args.scaffold]              chapter scaffold object
 * @param {string} [args.prose]
 * @param {Object} [args.prevFingerprint]
 * @param {Object} [args.options]
 * @returns {AuditReport}
 */
export function auditChapter({
  bible,
  scaffold,
  prose,
  prevFingerprint,
  options = {},
} = {}) {
  if (!bible) {
    return emptyReport({ reason: "no-bible" });
  }
  const continuity = auditContinuity(bible, scaffold, prose);
  const characterDrift = auditCharacterDrift(bible, scaffold, prose);
  const foreshadow = auditForeshadow(bible, scaffold, prose);
  const powerCurve = auditPowerCurve(bible, scaffold);
  const castBloat = auditCastBloat(bible, scaffold, options);
  const voice = auditVoice(bible, prose, prevFingerprint, options);
  const promiseDebt = auditPromiseDebt(bible, scaffold);

  const all = [
    ...continuity,
    ...characterDrift,
    ...foreshadow,
    ...powerCurve,
    ...castBloat,
    ...voice,
    ...promiseDebt,
  ];
  const score = scoreFindings(all);

  return {
    continuity,
    characterDrift,
    foreshadow,
    powerCurve,
    castBloat,
    voice,
    promiseDebt,
    score,
    meta: {
      findingsCount: all.length,
      hasProse: typeof prose === "string" && prose.trim().length > 0,
    },
  };
}

// ── subaudits ───────────────────────────────────────────────────────────

/**
 * Continuity: structural sanity. Does the scaffold reference characters and
 * locations that exist in the bible?
 */
export function auditContinuity(bible, scaffold) {
  const out = [];
  if (!scaffold) return out;
  const knownCharIds = new Set((bible.characters || []).map((c) => c.id));
  const knownLocIds = new Set((bible.locations || []).map((l) => l.id));

  for (const id of scaffold.charactersPresent || []) {
    if (typeof id === "string" && id.startsWith("char_") && !knownCharIds.has(id)) {
      out.push(warn("continuity:unknown-character", `Character ${id} not in bible`, { id }));
    }
  }
  if (scaffold.locationId && !knownLocIds.has(scaffold.locationId)) {
    out.push(warn("continuity:unknown-location", `Location ${scaffold.locationId} not in bible`, { id: scaffold.locationId }));
  }
  if (scaffold.chapter && bible.chapters?.length) {
    const dup = bible.chapters.find((c) => c.chapter === scaffold.chapter);
    if (dup) {
      out.push(warn("continuity:duplicate-chapter", `Chapter ${scaffold.chapter} already recorded`, { id: dup.id }));
    }
  }
  return out;
}

/**
 * Character drift: a character whose voiceNotes/role conflict with the
 * scaffold's intent. Cheap heuristic: if a "doNot" voice rule appears in
 * dialogue lines, flag it.
 */
export function auditCharacterDrift(bible, scaffold, prose) {
  const out = [];
  if (!prose || !bible.characters?.length) return out;
  const lowProse = String(prose).toLowerCase();
  for (const ch of bible.characters) {
    for (const rule of ch.voiceNotes || []) {
      if (typeof rule !== "string") continue;
      const m = rule.match(/^never[: ]+(.+)$/i) || rule.match(/^do not[: ]+(.+)$/i);
      if (m) {
        const phrase = m[1].toLowerCase().trim();
        if (phrase && lowProse.includes(phrase)) {
          out.push(warn(
            "drift:character-rule-violation",
            `${ch.name || ch.id} voice rule violated ("${rule}")`,
            { characterId: ch.id, rule }
          ));
        }
      }
    }
  }
  return out;
}

/**
 * Foreshadow ledger: anything the scaffold *promised* to pay off must
 * actually be referenced in prose; anything paid off must be marked.
 */
export function auditForeshadow(bible, scaffold, prose) {
  const out = [];
  if (!scaffold) return out;
  const ledger = bible.series?.foreshadowLedger || [];
  const ledgerById = new Map(ledger.map((f) => [f.id, f]));
  const lowProse = (prose || "").toLowerCase();

  for (const fsid of scaffold.foreshadowToPay || []) {
    const f = ledgerById.get(fsid);
    if (!f) {
      out.push(warn("foreshadow:unknown", `Foreshadow ${fsid} not in ledger`, { id: fsid }));
      continue;
    }
    if (f.status === "paid-off") {
      out.push(warn("foreshadow:double-pay", `Foreshadow ${fsid} already paid off`, { id: fsid }));
    }
    if (prose) {
      const needle = (f.label || "").toLowerCase();
      if (needle && needle.length > 3 && !lowProse.includes(needle)) {
        out.push(warn(
          "foreshadow:pay-not-evidenced",
          `Pay-off "${f.label}" not visible in prose`,
          { id: fsid }
        ));
      }
    }
  }
  for (const fsid of scaffold.foreshadowToPlant || []) {
    if (ledgerById.has(fsid) && ledgerById.get(fsid).status === "paid-off") {
      out.push(warn(
        "foreshadow:plant-after-pay",
        `Cannot plant ${fsid}: already paid off`,
        { id: fsid }
      ));
    }
  }
  return out;
}

/**
 * Power-curve: tier or stat regression. Looks at chapter records ordered by
 * chapter number; each subsequent tier value should be ≥ the prior.
 */
export function auditPowerCurve(bible) {
  const out = [];
  const chapters = [...(bible.chapters || [])].sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
  let lastTierIndex = -1;
  let lastTier = null;
  for (const c of chapters) {
    if (!c.tier) continue;
    const idx = tierOrder(bible, c.tier);
    if (lastTierIndex !== -1 && idx < lastTierIndex) {
      out.push(warn(
        "power:tier-regression",
        `Chapter ${c.chapter} tier "${c.tier}" regresses from "${lastTier}"`,
        { chapter: c.chapter }
      ));
    }
    lastTierIndex = idx;
    lastTier = c.tier;
  }
  return out;
}

function tierOrder(bible, tier) {
  const tiers = bible.contract?.system?.tiers || bible.series?.tiers || [];
  const i = tiers.indexOf(tier);
  return i === -1 ? 0 : i;
}

/**
 * Cast bloat: if more than `maxNewCharsPerChapter` new named characters
 * appear, warn. New = id not seen before in chapters[].
 */
export function auditCastBloat(bible, scaffold, options = {}) {
  const max = options.maxNewCharsPerChapter ?? 3;
  const out = [];
  if (!scaffold) return out;
  const seen = new Set();
  for (const c of bible.chapters || []) {
    for (const id of c.charactersPresent || []) seen.add(id);
  }
  const incoming = scaffold.charactersPresent || [];
  const fresh = incoming.filter((id) => !seen.has(id));
  if (fresh.length > max) {
    out.push(warn(
      "cast:bloat",
      `Chapter introduces ${fresh.length} new characters (max ${max})`,
      { newIds: fresh }
    ));
  }
  return out;
}

/**
 * Voice drift: compare prose fingerprint to the previous fingerprint.
 */
export function auditVoice(bible, prose, prevFingerprint, options = {}) {
  const out = [];
  if (!prose || typeof prose !== "string" || !prose.trim()) return out;
  const fp = fingerprintProse(prose);
  if (!prevFingerprint) {
    return [info("voice:baseline", "No prior fingerprint; baseline established", { fp })];
  }
  const { drift, diffs } = diffFingerprints(prevFingerprint, fp);
  const threshold = options.voiceDriftThreshold ?? 0.3;
  if (drift > threshold) {
    out.push(warn(
      "voice:drift",
      `Voice drift ${drift.toFixed(2)} exceeds threshold ${threshold}`,
      { drift, diffs }
    ));
  }
  if (diffs.povHint) {
    out.push(error("voice:pov-flip", `POV changed (${diffs.povHint})`, { diffs }));
  }
  if (diffs.tenseHint) {
    out.push(error("voice:tense-flip", `Tense changed (${diffs.tenseHint})`, { diffs }));
  }
  return out;
}

/**
 * Promise debt: open foreshadow whose plant was N or more chapters ago and
 * still unpaid.
 */
export function auditPromiseDebt(bible, scaffold) {
  const out = [];
  const ledger = bible.series?.foreshadowLedger || [];
  if (!ledger.length) return out;
  const currentChapter =
    (scaffold && scaffold.chapter) ||
    (bible.chapters?.length ? bible.chapters[bible.chapters.length - 1].chapter || 0 : 0);
  if (!currentChapter) return out;

  for (const f of ledger) {
    if (f.status === "paid-off") continue;
    const plantedChapter =
      f.plantedInChapter ||
      (f.plantedIn && estimatePlantedChapter(bible, f.plantedIn)) ||
      0;
    if (plantedChapter && currentChapter - plantedChapter >= (f.maxLatency || 12)) {
      out.push(warn(
        "promise:debt",
        `Foreshadow "${f.label || f.id}" open for ${currentChapter - plantedChapter} chapters`,
        { id: f.id, plantedChapter, currentChapter }
      ));
    }
  }
  return out;
}

function estimatePlantedChapter(bible, plantedIn) {
  // Best-effort: if a chapter record carries a matching beat ref, use it.
  if (!plantedIn || typeof plantedIn !== "object") return 0;
  const ch = (bible.chapters || []).find(
    (c) => c.bookIndex === plantedIn.book && c.beatIndex === plantedIn.beat
  );
  return ch?.chapter || 0;
}

// ── helpers ─────────────────────────────────────────────────────────────

function emptyReport(meta = {}) {
  return {
    continuity: [],
    characterDrift: [],
    foreshadow: [],
    powerCurve: [],
    castBloat: [],
    voice: [],
    promiseDebt: [],
    score: 1,
    meta,
  };
}

function info(kind, message, ref) {
  return { kind, severity: "info", message, ref };
}
function warn(kind, message, ref) {
  return { kind, severity: "warn", message, ref };
}
function error(kind, message, ref) {
  return { kind, severity: "error", message, ref };
}

function scoreFindings(findings) {
  if (!findings.length) return 1;
  // Each warn -1, each error -3, each info 0; clamp to [0,1] over a budget of 10.
  const cost = findings.reduce((n, f) => {
    if (f.severity === "error") return n + 3;
    if (f.severity === "warn") return n + 1;
    return n;
  }, 0);
  return Math.max(0, 1 - cost / 10);
}

export const __testing = { scoreFindings };
