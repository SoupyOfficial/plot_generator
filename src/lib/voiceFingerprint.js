// src/lib/voiceFingerprint.js
//
// Voice Fingerprint — extract structural style metrics from prose so we can
// detect drift across long projects. Intentionally simple, language-aware
// only at the punctuation level. No NLP dependency.
//
// Pure function; no LLM, no DOM.
//
// Captured metrics (all numeric so we can diff cheaply):
//   - avgSentenceLen        words / sentence
//   - sentenceLenStdDev
//   - avgParagraphLen       sentences / paragraph
//   - dialogueRatio         0..1, fraction of paragraphs containing "
//   - saidRatio             0..1, "said" occurrences / dialogue paragraphs
//   - povHint               "first" | "third" | "unknown"  (i/me/my vs he/she/they)
//   - tenseHint             "past" | "present" | "unknown"
//   - openersTopN           array of top-N sentence-opening words (lowercased)
//   - lexicalDiversity      unique-words / total-words   (Type-Token Ratio)

const SENT_END = /([.!?])\s+/g;
const PARA_SPLIT = /\n\s*\n/;
const WORD_RE = /[A-Za-z][A-Za-z'\-]*/g;

const FIRST_PERSON = ["i", "me", "my", "mine", "myself", "we", "us", "our"];
const THIRD_PERSON = ["he", "she", "they", "him", "her", "them", "his", "hers", "their"];

const PRESENT_TENSE_HINTS = [" is ", " am ", " are ", " walks ", " says ", " runs ", " takes "];
const PAST_TENSE_HINTS = [" was ", " were ", " walked ", " said ", " ran ", " took "];

/**
 * Build a voice fingerprint from one prose blob (or many concatenated).
 *
 * @param {string|string[]} input
 * @param {Object} [opts]
 * @param {number} [opts.openerN]  default 8
 * @returns {Object} fingerprint
 */
export function fingerprintProse(input, { openerN = 8 } = {}) {
  const text = Array.isArray(input) ? input.join("\n\n") : String(input || "");
  if (!text.trim()) return emptyFingerprint();

  const paragraphs = text.split(PARA_SPLIT).map((p) => p.trim()).filter(Boolean);

  const sentences = splitSentences(text);
  const sentenceLens = sentences.map((s) => (s.match(WORD_RE) || []).length);

  const allWords = (text.match(WORD_RE) || []).map((w) => w.toLowerCase());
  const totalWords = allWords.length;
  const uniqueWords = new Set(allWords).size;

  // Dialogue ratio: paragraph contains a curly or straight double-quote.
  const dialogueParas = paragraphs.filter((p) => /["“”]/.test(p));
  const dialogueRatio = paragraphs.length ? dialogueParas.length / paragraphs.length : 0;

  // "said" occurrences in dialogue paragraphs only.
  const saidCount = dialogueParas.reduce(
    (n, p) => n + ((p.toLowerCase().match(/\bsaid\b/g) || []).length),
    0
  );
  const saidRatio = dialogueParas.length ? saidCount / dialogueParas.length : 0;

  // POV hint by pronoun frequency across all words.
  const fpHits = countAny(allWords, FIRST_PERSON);
  const tpHits = countAny(allWords, THIRD_PERSON);
  let povHint = "unknown";
  if (fpHits === 0 && tpHits === 0) povHint = "unknown";
  else if (fpHits >= tpHits * 1.2) povHint = "first";
  else if (tpHits >= fpHits * 1.2) povHint = "third";

  // Tense hint from common verb forms in sentence body.
  const lowerText = " " + text.toLowerCase() + " ";
  const presentHits = PRESENT_TENSE_HINTS.reduce((n, h) => n + occurrences(lowerText, h), 0);
  const pastHits = PAST_TENSE_HINTS.reduce((n, h) => n + occurrences(lowerText, h), 0);
  let tenseHint = "unknown";
  if (presentHits === 0 && pastHits === 0) tenseHint = "unknown";
  else if (pastHits >= presentHits * 1.2) tenseHint = "past";
  else if (presentHits >= pastHits * 1.2) tenseHint = "present";

  // Sentence openers (first word of each sentence, lowercased).
  const openers = sentences
    .map((s) => {
      const m = s.match(WORD_RE);
      return m ? m[0].toLowerCase() : null;
    })
    .filter(Boolean);
  const openerCounts = countMap(openers);
  const openersTopN = topN(openerCounts, openerN);

  // Sentence length stats.
  const avgSentenceLen = sentenceLens.length
    ? sentenceLens.reduce((a, b) => a + b, 0) / sentenceLens.length
    : 0;
  const sentenceLenStdDev = stdDev(sentenceLens, avgSentenceLen);

  // Paragraph length stats (sentences per paragraph).
  const sentsPerPara = paragraphs.map(
    (p) => splitSentences(p).length || 0
  );
  const avgParagraphLen = sentsPerPara.length
    ? sentsPerPara.reduce((a, b) => a + b, 0) / sentsPerPara.length
    : 0;

  return {
    avgSentenceLen: round2(avgSentenceLen),
    sentenceLenStdDev: round2(sentenceLenStdDev),
    avgParagraphLen: round2(avgParagraphLen),
    dialogueRatio: round2(dialogueRatio),
    saidRatio: round2(saidRatio),
    povHint,
    tenseHint,
    openersTopN,
    lexicalDiversity: totalWords ? round2(uniqueWords / totalWords) : 0,
    sampleSize: totalWords,
  };
}

/**
 * Compare two fingerprints and return a drift score 0..1 plus per-metric
 * diffs. 0 = identical. >0.25 = noticeable drift.
 */
export function diffFingerprints(a, b) {
  if (!a || !b) return { drift: 1, diffs: { reason: "missing-fingerprint" } };
  const diffs = {};
  let total = 0;
  let weightSum = 0;

  const numericPairs = [
    ["avgSentenceLen", 1.0, 30],
    ["sentenceLenStdDev", 0.5, 15],
    ["avgParagraphLen", 0.5, 6],
    ["dialogueRatio", 1.0, 1],
    ["saidRatio", 0.5, 1],
    ["lexicalDiversity", 0.5, 0.5],
  ];
  for (const [key, weight, scale] of numericPairs) {
    const dv = Math.abs((a[key] || 0) - (b[key] || 0)) / (scale || 1);
    diffs[key] = round2(dv);
    total += Math.min(1, dv) * weight;
    weightSum += weight;
  }

  if (a.povHint !== b.povHint && a.povHint !== "unknown" && b.povHint !== "unknown") {
    diffs.povHint = `${a.povHint}→${b.povHint}`;
    total += 1.5;
    weightSum += 1.5;
  }
  if (a.tenseHint !== b.tenseHint && a.tenseHint !== "unknown" && b.tenseHint !== "unknown") {
    diffs.tenseHint = `${a.tenseHint}→${b.tenseHint}`;
    total += 1.5;
    weightSum += 1.5;
  }

  // Opener overlap (top-N intersection).
  const aSet = new Set((a.openersTopN || []).map((o) => o.word));
  const bSet = new Set((b.openersTopN || []).map((o) => o.word));
  const inter = [...aSet].filter((w) => bSet.has(w)).length;
  const union = new Set([...aSet, ...bSet]).size || 1;
  const openersJaccard = inter / union;
  diffs.openersJaccard = round2(openersJaccard);
  total += (1 - openersJaccard) * 0.5;
  weightSum += 0.5;

  return {
    drift: round2(weightSum ? total / weightSum : 0),
    diffs,
  };
}

// ── helpers ─────────────────────────────────────────────────────────────

function emptyFingerprint() {
  return {
    avgSentenceLen: 0,
    sentenceLenStdDev: 0,
    avgParagraphLen: 0,
    dialogueRatio: 0,
    saidRatio: 0,
    povHint: "unknown",
    tenseHint: "unknown",
    openersTopN: [],
    lexicalDiversity: 0,
    sampleSize: 0,
  };
}

function splitSentences(text) {
  // Replace sentence terminators with a marker, then split.
  const marked = text.replace(SENT_END, "$1\u0001");
  return marked
    .split("\u0001")
    .map((s) => s.trim())
    .filter(Boolean);
}

function countAny(words, set) {
  const lower = new Set(set);
  let n = 0;
  for (const w of words) if (lower.has(w)) n++;
  return n;
}

function occurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

function countMap(items) {
  const m = new Map();
  for (const it of items) m.set(it, (m.get(it) || 0) + 1);
  return m;
}

function topN(map, n) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

function stdDev(arr, mean) {
  if (!arr.length) return 0;
  const m = typeof mean === "number" ? mean : arr.reduce((a, b) => a + b, 0) / arr.length;
  const sq = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(sq);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
