// src/lib/ingestChapter.js
//
// Ingest a finished chapter back into the bible: append the chapter record,
// roll up rolling-summary, and reconcile foreshadow ledger pay-offs/plants.
// Closes the loop in the pipeline (state-machine truth update).
//
// Pure functions; no LLM, no DOM. The caller supplies a `summarize` function
// if they want a richer rolling summary (otherwise we deterministically
// concatenate chapter outcomes).

import { appendChapterRecord, setRollingSummary, linkCharacterToBeat } from "./bible.js";
import { payOffForeshadow, addForeshadow } from "./seriesPlan.js";

/**
 * @param {Object} args
 * @param {Object} args.bible
 * @param {Object} args.scaffold       chapter scaffold (truth-of-intent)
 * @param {string} [args.prose]        rendered prose
 * @param {Object} [args.fingerprint]  voice fingerprint of prose
 * @param {Object} [args.audit]        AuditReport from auditChapter()
 * @param {Function} [args.summarize]  custom rolling-summary function
 * @returns {{bible:Object, chapterId:string, ingested:Object}}
 */
export function ingestChapter({
  bible,
  scaffold,
  prose,
  fingerprint,
  audit,
  summarize,
} = {}) {
  if (!bible) throw new Error("ingestChapter: bible is required");
  if (!scaffold) throw new Error("ingestChapter: scaffold is required");

  const wordCount = countWords(prose);
  const record = {
    chapter: scaffold.chapter,
    bookIndex: scaffold.bookIndex || bible.series?.currentBookIndex || 1,
    beatIndex: scaffold.beatIndex,
    title: scaffold.title || `Chapter ${scaffold.chapter}`,
    summary: scaffold.summary || "",
    pov: scaffold.pov || "",
    location: scaffold.location || "",
    locationId: scaffold.locationId || null,
    charactersPresent: [...(scaffold.charactersPresent || [])],
    foreshadowPlanted: [...(scaffold.foreshadowToPlant || [])],
    foreshadowPaid: [...(scaffold.foreshadowToPay || [])],
    tier: scaffold.tier || null,
    wordCount,
    voiceFingerprint: fingerprint || null,
    auditScore: audit?.score ?? null,
    createdAt: new Date().toISOString(),
  };

  // 1) Append chapter record.
  let { bible: nextBible, id: chapterId } = appendChapterRecord(bible, record);

  // 2) Link characters to this chapter's beat.
  const where = {
    book: record.bookIndex,
    beat: record.beatIndex || record.chapter,
  };
  for (const charId of record.charactersPresent) {
    if (typeof charId === "string" && charId.startsWith("char_")) {
      nextBible = linkCharacterToBeat(nextBible, charId, where);
    }
  }

  // 3) Reconcile foreshadow ledger.
  if (nextBible.series) {
    let series = nextBible.series;
    for (const fsid of record.foreshadowPaid) {
      if ((series.foreshadowLedger || []).some((f) => f.id === fsid)) {
        series = payOffForeshadow(series, fsid, where);
      }
    }
    for (const fsid of record.foreshadowPlanted) {
      if (!(series.foreshadowLedger || []).some((f) => f.id === fsid)) {
        const r = addForeshadow(series, { id: fsid, plantedIn: where });
        series = r.plan;
      }
    }
    nextBible = { ...nextBible, series };
  }

  // 4) Roll up the rolling summary.
  const lastN = nextBible.rollingSummary?.lastNChapters || 3;
  const tail = (nextBible.chapters || []).slice(-lastN);
  const newSummary =
    typeof summarize === "function"
      ? String(summarize(tail) || "")
      : defaultSummary(tail);
  nextBible = setRollingSummary(nextBible, newSummary, lastN);

  return { bible: nextBible, chapterId, ingested: record };
}

function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return (text.match(/[A-Za-z][A-Za-z'\-]*/g) || []).length;
}

function defaultSummary(records) {
  if (!records.length) return "";
  return records
    .map((r) => {
      const head = `Ch ${r.chapter}${r.title ? `: ${r.title}` : ""}`;
      const body = r.summary?.trim() || "(no summary recorded)";
      return `${head} — ${body}`;
    })
    .join("\n");
}

export const __testing = { defaultSummary, countWords };
