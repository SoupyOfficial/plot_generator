// src/lib/__tests__/auditChapter.test.js
import { describe, it, expect } from "vitest";
import {
  auditChapter,
  auditContinuity,
  auditCharacterDrift,
  auditForeshadow,
  auditPowerCurve,
  auditCastBloat,
  auditVoice,
  auditPromiseDebt,
} from "../auditChapter.js";
import { fingerprintProse } from "../voiceFingerprint.js";

function fakeBible(overrides = {}) {
  return {
    contract: { system: { tiers: ["Mortal", "Spirit", "Sage"] } },
    series: { foreshadowLedger: [] },
    characters: [],
    locations: [],
    chapters: [],
    styleGuide: {},
    ...overrides,
  };
}

describe("auditChapter (top level)", () => {
  it("returns clean report for empty inputs", () => {
    const r = auditChapter({ bible: fakeBible() });
    expect(r.score).toBe(1);
    expect(r.continuity).toEqual([]);
  });

  it("returns score=1 with reason when no bible", () => {
    const r = auditChapter({});
    expect(r.score).toBe(1);
    expect(r.meta.reason).toBe("no-bible");
  });

  it("aggregates findings from multiple subaudits", () => {
    const bible = fakeBible({
      characters: [
        { id: "char_lin", name: "Lin", voiceNotes: ["never: smile"] },
      ],
    });
    const scaffold = {
      chapter: 1,
      charactersPresent: ["char_lin", "char_ghost"], // ghost = unknown
      foreshadowToPay: ["fs_missing"],
    };
    const prose = "Lin smiled in the dark.";
    const r = auditChapter({ bible, scaffold, prose });
    expect(r.continuity.length).toBeGreaterThan(0);
    expect(r.characterDrift.length).toBeGreaterThan(0);
    expect(r.foreshadow.length).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(1);
  });
});

describe("auditContinuity", () => {
  it("flags unknown characters and locations", () => {
    const bible = fakeBible({
      characters: [{ id: "char_lin", name: "Lin" }],
      locations: [{ id: "loc_dojo", name: "Dojo" }],
    });
    const scaffold = {
      charactersPresent: ["char_lin", "char_X"],
      locationId: "loc_Y",
    };
    const out = auditContinuity(bible, scaffold);
    expect(out.some((f) => f.kind === "continuity:unknown-character")).toBe(true);
    expect(out.some((f) => f.kind === "continuity:unknown-location")).toBe(true);
  });

  it("flags duplicate chapter numbers", () => {
    const bible = fakeBible({ chapters: [{ id: "c1", chapter: 1 }] });
    const out = auditContinuity(bible, { chapter: 1 });
    expect(out.some((f) => f.kind === "continuity:duplicate-chapter")).toBe(true);
  });
});

describe("auditCharacterDrift", () => {
  it("flags voice rule violations", () => {
    const bible = fakeBible({
      characters: [{ id: "char_lin", name: "Lin", voiceNotes: ["never: apologize"] }],
    });
    const out = auditCharacterDrift(bible, {}, "Lin began to apologize quietly.");
    expect(out.length).toBeGreaterThan(0);
  });

  it("returns empty when no rules apply", () => {
    const bible = fakeBible({
      characters: [{ id: "char_lin", voiceNotes: ["never: apologize"] }],
    });
    expect(auditCharacterDrift(bible, {}, "She drew her sword.")).toEqual([]);
  });
});

describe("auditForeshadow", () => {
  it("flags pay of unknown foreshadow", () => {
    const bible = fakeBible();
    const out = auditForeshadow(bible, { foreshadowToPay: ["fs_X"] }, "");
    expect(out.some((f) => f.kind === "foreshadow:unknown")).toBe(true);
  });

  it("flags double pay-off", () => {
    const bible = fakeBible({
      series: { foreshadowLedger: [{ id: "fs_A", label: "locket", status: "paid-off" }] },
    });
    const out = auditForeshadow(bible, { foreshadowToPay: ["fs_A"] }, "");
    expect(out.some((f) => f.kind === "foreshadow:double-pay")).toBe(true);
  });

  it("flags pay-off not evidenced in prose", () => {
    const bible = fakeBible({
      series: { foreshadowLedger: [{ id: "fs_A", label: "locket", status: "planted" }] },
    });
    const out = auditForeshadow(
      bible,
      { foreshadowToPay: ["fs_A"] },
      "She walked across the courtyard."
    );
    expect(out.some((f) => f.kind === "foreshadow:pay-not-evidenced")).toBe(true);
  });
});

describe("auditPowerCurve", () => {
  it("flags tier regressions", () => {
    const bible = fakeBible({
      chapters: [
        { id: "c1", chapter: 1, tier: "Spirit" },
        { id: "c2", chapter: 2, tier: "Mortal" },
      ],
    });
    const out = auditPowerCurve(bible);
    expect(out.some((f) => f.kind === "power:tier-regression")).toBe(true);
  });

  it("returns empty for monotonic curves", () => {
    const bible = fakeBible({
      chapters: [
        { id: "c1", chapter: 1, tier: "Mortal" },
        { id: "c2", chapter: 2, tier: "Spirit" },
      ],
    });
    expect(auditPowerCurve(bible)).toEqual([]);
  });
});

describe("auditCastBloat", () => {
  it("flags chapters introducing too many new characters", () => {
    const bible = fakeBible({
      chapters: [{ id: "c1", chapter: 1, charactersPresent: ["char_a"] }],
    });
    const scaffold = { charactersPresent: ["char_b", "char_c", "char_d", "char_e"] };
    const out = auditCastBloat(bible, scaffold, { maxNewCharsPerChapter: 2 });
    expect(out.some((f) => f.kind === "cast:bloat")).toBe(true);
  });
});

describe("auditVoice", () => {
  it("returns baseline info on first chapter", () => {
    const bible = fakeBible();
    const out = auditVoice(bible, "She walked into the dark courtyard alone.", null);
    expect(out.some((f) => f.kind === "voice:baseline")).toBe(true);
  });

  it("flags pov flip as error", () => {
    const bible = fakeBible();
    const prev = fingerprintProse(
      "I walked into the courtyard alone. I had nothing to say."
    );
    const out = auditVoice(
      bible,
      "He walks into the courtyard alone. He has nothing to say.",
      prev
    );
    expect(out.some((f) => f.kind === "voice:pov-flip")).toBe(true);
    expect(out.some((f) => f.kind === "voice:tense-flip")).toBe(true);
  });
});

describe("auditPromiseDebt", () => {
  it("flags long-overdue foreshadows", () => {
    const bible = fakeBible({
      series: {
        foreshadowLedger: [
          { id: "fs_old", label: "the locket", status: "planted", plantedInChapter: 1, maxLatency: 5 },
        ],
      },
      chapters: [{ id: "c10", chapter: 10 }],
    });
    const out = auditPromiseDebt(bible, { chapter: 10 });
    expect(out.some((f) => f.kind === "promise:debt")).toBe(true);
  });

  it("does not flag paid-off foreshadows", () => {
    const bible = fakeBible({
      series: {
        foreshadowLedger: [
          { id: "fs_old", label: "the locket", status: "paid-off", plantedInChapter: 1 },
        ],
      },
    });
    expect(auditPromiseDebt(bible, { chapter: 50 })).toEqual([]);
  });
});
