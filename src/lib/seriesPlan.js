// src/lib/seriesPlan.js
//
// Phase 11: Series Plan + Foreshadow Ledger.
//
// Solves the genre's #1 failure mode: drift across books. A SeriesPlan
// expresses how the series-level 15-beat structure maps onto individual
// books, and tracks foreshadow promises through to their payoff.
//
// All mutations return new objects (immutable). No DOM access here.

/**
 * @typedef {Object} BeatAnchor
 * @property {number} metaBeat   1-based index into the series-level 15 beats
 * @property {number} bookBeat   1-based index into this book's 15 beats
 *
 * @typedef {Object} BookPlan
 * @property {number} index             1-based
 * @property {string} [workingTitle]
 * @property {BeatAnchor[]} beatAnchors
 * @property {string} [endTier]         power ceiling at end of book
 * @property {string[]} promiseToPayOff foreshadow ids planted here
 * @property {string[]} promisesPaidOff foreshadow ids retired here
 *
 * @typedef {Object} ForeshadowEntry
 * @property {string} id
 * @property {{book: number, beat: number}} plantedIn
 * @property {{book: number, beat: number}} paysOffIn
 * @property {string} description
 * @property {"planted"|"reinforced"|"paid-off"|"broken"} status
 *
 * @typedef {Object} SeriesPlan
 * @property {number|"open"} totalBooks
 * @property {Array} metaBeats          15 series-level beats
 * @property {BookPlan[]} books
 * @property {ForeshadowEntry[]} foreshadowLedger
 */

/**
 * Cheap id generator; collision-free enough for client-side use.
 */
let _idCounter = 0;
function nextId(prefix = "fs") {
  _idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * Create an empty series plan. Books are pre-allocated when totalBooks is
 * a number; otherwise the plan starts with one book.
 */
export function createSeriesPlan({ totalBooks = "open", metaBeats } = {}) {
  const books = [];
  const count = typeof totalBooks === "number" && totalBooks > 0 ? totalBooks : 1;
  for (let i = 1; i <= count; i++) {
    books.push(createBookPlan(i));
  }
  return {
    totalBooks: totalBooks === "open" ? "open" : count,
    metaBeats: Array.isArray(metaBeats) ? [...metaBeats] : [],
    books,
    foreshadowLedger: [],
  };
}

export function createBookPlan(index) {
  return {
    index,
    workingTitle: "",
    beatAnchors: [],
    endTier: "",
    promiseToPayOff: [],
    promisesPaidOff: [],
  };
}

/**
 * Append a new book to the plan (only meaningful for open-ended series).
 * Returns a new plan.
 */
export function addBook(plan, partial = {}) {
  const next = (plan.books?.length || 0) + 1;
  const book = { ...createBookPlan(next), ...partial, index: next };
  return {
    ...plan,
    books: [...(plan.books || []), book],
    totalBooks: plan.totalBooks === "open" ? "open" : Math.max(plan.totalBooks, next),
  };
}

/**
 * Update book[index] (1-based) immutably.
 */
export function updateBook(plan, index, patch) {
  return {
    ...plan,
    books: (plan.books || []).map((b) =>
      b.index === index ? { ...b, ...patch, index: b.index } : b
    ),
  };
}

/**
 * Add a foreshadow entry. Auto-generates an id if missing. Auto-attaches the
 * id to the planted book's `promiseToPayOff` list.
 *
 * @param {SeriesPlan} plan
 * @param {Partial<ForeshadowEntry>} entry
 * @returns {{ plan: SeriesPlan, id: string }}
 */
export function addForeshadow(plan, entry) {
  const id = entry.id || nextId("fs");
  const fs = {
    id,
    plantedIn: entry.plantedIn || { book: 1, beat: 1 },
    paysOffIn: entry.paysOffIn || { book: 1, beat: 15 },
    description: entry.description || "",
    status: entry.status || "planted",
  };
  const ledger = [...(plan.foreshadowLedger || []), fs];
  let books = plan.books || [];
  const plantBook = fs.plantedIn?.book;
  if (plantBook) {
    books = books.map((b) =>
      b.index === plantBook
        ? { ...b, promiseToPayOff: [...(b.promiseToPayOff || []), id] }
        : b
    );
  }
  return { plan: { ...plan, foreshadowLedger: ledger, books }, id };
}

/**
 * Mark a foreshadow as paid-off in book/beat. If `where` is omitted, uses the
 * entry's existing `paysOffIn`. Updates both the ledger entry and the book's
 * `promisesPaidOff` list.
 */
export function payOffForeshadow(plan, id, where) {
  const ledger = (plan.foreshadowLedger || []).map((e) => {
    if (e.id !== id) return e;
    return {
      ...e,
      status: "paid-off",
      paysOffIn: where || e.paysOffIn,
    };
  });
  const target = ledger.find((e) => e.id === id);
  if (!target) return plan;
  const payBook = target.paysOffIn?.book;
  const books = (plan.books || []).map((b) => {
    if (b.index !== payBook) return b;
    if ((b.promisesPaidOff || []).includes(id)) return b;
    return { ...b, promisesPaidOff: [...(b.promisesPaidOff || []), id] };
  });
  return { ...plan, foreshadowLedger: ledger, books };
}

/**
 * Mark a foreshadow as broken (planted but contradicted later).
 */
export function breakForeshadow(plan, id, reason = "") {
  const ledger = (plan.foreshadowLedger || []).map((e) =>
    e.id === id ? { ...e, status: "broken", brokenReason: reason } : e
  );
  return { ...plan, foreshadowLedger: ledger };
}

/**
 * Validate a series plan. Returns string[] of warnings.
 */
export function validateSeriesPlan(plan) {
  const warnings = [];
  if (!plan) return ["empty-plan"];

  const ledger = plan.foreshadowLedger || [];
  const books = plan.books || [];
  const finalBookIdx =
    plan.totalBooks === "open" ? books[books.length - 1]?.index : plan.totalBooks;

  // Orphaned planted breadcrumbs (planted but not paid off and series end)
  for (const e of ledger) {
    if (e.status === "planted" || e.status === "reinforced") {
      const payBook = e.paysOffIn?.book;
      if (
        plan.totalBooks !== "open" &&
        typeof payBook === "number" &&
        payBook > plan.totalBooks
      ) {
        warnings.push(
          `Foreshadow "${e.description || e.id}" is scheduled to pay off in book ${payBook}, beyond the series total (${plan.totalBooks}).`
        );
      }
      if (
        plan.totalBooks !== "open" &&
        e.paysOffIn == null &&
        e.plantedIn?.book === plan.totalBooks
      ) {
        warnings.push(
          `Foreshadow "${e.description || e.id}" is planted in the final book without a payoff target.`
        );
      }
    }
    if (e.plantedIn?.book && e.paysOffIn?.book) {
      if (e.paysOffIn.book < e.plantedIn.book) {
        warnings.push(
          `Foreshadow "${e.description || e.id}" pays off (book ${e.paysOffIn.book}) before it is planted (book ${e.plantedIn.book}).`
        );
      }
      if (
        e.paysOffIn.book === e.plantedIn.book &&
        typeof e.paysOffIn.beat === "number" &&
        typeof e.plantedIn.beat === "number" &&
        e.paysOffIn.beat <= e.plantedIn.beat
      ) {
        warnings.push(
          `Foreshadow "${e.description || e.id}" pays off at or before the beat it is planted in.`
        );
      }
    }
  }

  // Beat anchors out of order within a book
  for (const b of books) {
    const seq = (b.beatAnchors || []).map((a) => a.metaBeat);
    const sorted = [...seq].sort((a, b) => a - b);
    if (seq.join(",") !== sorted.join(",")) {
      warnings.push(
        `Book ${b.index}: beat anchors are out of order. Series-level beats should ascend across the book.`
      );
    }
  }

  // Final book has no end-tier
  if (finalBookIdx) {
    const finalBook = books.find((b) => b.index === finalBookIdx);
    if (finalBook && !finalBook.endTier) {
      warnings.push(
        `Final book (#${finalBookIdx}) has no end-tier set. Define the power ceiling so the series resolution lands.`
      );
    }
  }

  return warnings;
}

/**
 * Find ledger entries that are still open (planted/reinforced). Useful for
 * the UI's "active promises" display.
 */
export function activePromises(plan) {
  return (plan?.foreshadowLedger || []).filter(
    (e) => e.status === "planted" || e.status === "reinforced"
  );
}

/**
 * Promises planted in or before the given book that have NOT yet paid off.
 * The chapter planner uses this to remind the writer what's still in flight.
 */
export function promisesActiveAt(plan, bookIndex) {
  return (plan?.foreshadowLedger || []).filter((e) => {
    if (e.status === "paid-off" || e.status === "broken") return false;
    return (e.plantedIn?.book || 0) <= bookIndex;
  });
}
