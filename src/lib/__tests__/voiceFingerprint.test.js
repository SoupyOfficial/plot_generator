// src/lib/__tests__/voiceFingerprint.test.js
import { describe, it, expect } from "vitest";
import { fingerprintProse, diffFingerprints } from "../voiceFingerprint.js";

const FIRST_PAST = `
I walked into the courtyard alone. The bells were silent.
"You're late," she said. I shrugged.

I had nothing to say. The wind tugged at my sleeve. I crossed the stones.
She watched me come, her hands folded.

"You knew the price," she said. I nodded once.
`.trim();

const THIRD_PRESENT = `
He walks into the courtyard alone. The bells are silent.
"You're late," she says. He shrugs.

He has nothing to say. The wind tugs at his sleeve. He crosses the stones.
She watches him come, her hands folded.

"You knew the price," she says. He nods once.
`.trim();

describe("fingerprintProse", () => {
  it("returns an empty fingerprint for empty input", () => {
    const fp = fingerprintProse("");
    expect(fp.sampleSize).toBe(0);
    expect(fp.povHint).toBe("unknown");
    expect(fp.tenseHint).toBe("unknown");
  });

  it("detects first-person past tense", () => {
    const fp = fingerprintProse(FIRST_PAST);
    expect(fp.povHint).toBe("first");
    expect(fp.tenseHint).toBe("past");
    expect(fp.sampleSize).toBeGreaterThan(0);
  });

  it("detects third-person present tense", () => {
    const fp = fingerprintProse(THIRD_PRESENT);
    expect(fp.povHint).toBe("third");
    expect(fp.tenseHint).toBe("present");
  });

  it("computes dialogueRatio > 0 when paragraphs contain quotes", () => {
    const fp = fingerprintProse(FIRST_PAST);
    expect(fp.dialogueRatio).toBeGreaterThan(0);
    expect(fp.saidRatio).toBeGreaterThan(0);
  });

  it("computes a sane lexical diversity in 0..1", () => {
    const fp = fingerprintProse(FIRST_PAST);
    expect(fp.lexicalDiversity).toBeGreaterThan(0);
    expect(fp.lexicalDiversity).toBeLessThanOrEqual(1);
  });

  it("returns top-N openers as {word,count}", () => {
    const fp = fingerprintProse(FIRST_PAST);
    expect(Array.isArray(fp.openersTopN)).toBe(true);
    expect(fp.openersTopN.length).toBeGreaterThan(0);
    expect(fp.openersTopN[0]).toHaveProperty("word");
    expect(fp.openersTopN[0]).toHaveProperty("count");
  });

  it("avgSentenceLen > 0 for nonempty prose", () => {
    const fp = fingerprintProse(FIRST_PAST);
    expect(fp.avgSentenceLen).toBeGreaterThan(0);
  });
});

describe("diffFingerprints", () => {
  it("returns ~0 drift for identical prose", () => {
    const a = fingerprintProse(FIRST_PAST);
    const b = fingerprintProse(FIRST_PAST);
    const r = diffFingerprints(a, b);
    expect(r.drift).toBeLessThan(0.05);
  });

  it("returns high drift across pov/tense flip", () => {
    const a = fingerprintProse(FIRST_PAST);
    const b = fingerprintProse(THIRD_PRESENT);
    const r = diffFingerprints(a, b);
    expect(r.drift).toBeGreaterThan(0.25);
    expect(r.diffs.povHint).toMatch(/first.*third/);
    expect(r.diffs.tenseHint).toMatch(/past.*present/);
  });

  it("flags missing fingerprint", () => {
    expect(diffFingerprints(null, {}).drift).toBe(1);
  });
});
