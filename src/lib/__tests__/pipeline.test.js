// src/lib/__tests__/pipeline.test.js
import { describe, it, expect } from "vitest";
import {
  PHASES,
  createPipelineState,
  advance,
  runDeterministicPhases,
} from "../pipeline.js";

const sampleSelections = {
  System_Purpose: "growth",
  Resolution_Mode: "earned",
};

describe("pipeline phases", () => {
  it("includes the canonical phases in order", () => {
    for (const p of [
      "selections",
      "contract",
      "series",
      "outline",
      "arcs",
      "beats",
      "scenes",
      "bible",
      "scaffold",
      "prose",
      "audit",
      "ingest",
      "done",
    ]) {
      expect(PHASES).toContain(p);
    }
  });
});

describe("advance", () => {
  it("walks selections → contract → series", () => {
    let s = createPipelineState({ selections: sampleSelections });
    expect(s.phase).toBe("selections");
    s = advance(s);
    expect(s.phase).toBe("contract");
    expect(s.contract).toBeTruthy();
    s = advance(s, { totalBooks: 2 });
    expect(s.phase).toBe("series");
    expect(s.series.books).toHaveLength(2);
  });

  it("walks series → outline → arcs → beats → scenes → bible", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s, {
      series: { totalBooks: 1 },
      arcs: { totalChapters: 12, targetArcCount: 3 },
      beats: { beatsPerChapter: 1 },
      scenes: { wordsPerScene: 1000 },
    });
    expect(s.phase).toBe("bible");
    expect(s.outline.beats.length).toBeGreaterThan(0);
    expect(s.arcPlan.arcs.length).toBe(3);
    expect(s.beatSheet.beats.length).toBeGreaterThan(0);
    expect(s.sceneGrid.scenes.length).toBeGreaterThan(0);
    expect(s.bible).toBeTruthy();
  });

  it("emits a scaffold prompt for chapter 1", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s, {
      arcs: { totalChapters: 8, targetArcCount: 2 },
    });
    s = advance(s);
    expect(s.phase).toBe("scaffold");
    expect(s.pendingPrompt.kind).toBe("scaffold");
    expect(typeof s.pendingPrompt.system).toBe("string");
    expect(typeof s.pendingPrompt.user).toBe("string");
    expect(s.chapterIndex).toBe(1);
  });

  it("requires a scaffold to advance to prose", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s, {
      arcs: { totalChapters: 4, targetArcCount: 2 },
    });
    s = advance(s); // → scaffold
    expect(() => advance(s, {})).toThrow(/scaffold required/);
    s = advance(s, {
      scaffold: { title: "One", charactersPresent: [], chapterNumber: 1 },
    });
    expect(s.phase).toBe("prose");
    expect(s.pendingPrompt.kind).toBe("prose");
  });

  it("audits prose and stores fingerprint + audit", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s, {
      arcs: { totalChapters: 4, targetArcCount: 2 },
    });
    s = advance(s); // scaffold
    s = advance(s, { scaffold: { title: "One", chapter: 1 } });
    s = advance(s, { prose: "She walked into the courtyard. The bells were silent." });
    expect(s.phase).toBe("audit");
    expect(s.currentAudit).toBeTruthy();
    expect(s.currentFingerprint).toBeTruthy();
  });

  it("ingests the chapter into the bible", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s, {
      arcs: { totalChapters: 4, targetArcCount: 2 },
    });
    s = advance(s); // scaffold
    s = advance(s, { scaffold: { title: "One", chapter: 1 } });
    s = advance(s, { prose: "She walked into the courtyard." });
    s = advance(s); // audit → ingest
    expect(s.phase).toBe("ingest");
    expect(s.bible.chapters).toHaveLength(1);
  });

  it("loops to next chapter then reaches done", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s, {
      arcs: { totalChapters: 2, targetArcCount: 2 },
    });
    // chapter 1
    s = advance(s); // scaffold
    s = advance(s, { scaffold: { title: "1", chapter: 1 } });
    s = advance(s, { prose: "p" });
    s = advance(s); // ingest
    s = advance(s); // → bible (next chapter)
    expect(s.phase).toBe("bible");
    expect(s.chapterIndex).toBe(2);
    // chapter 2
    s = advance(s); // scaffold
    s = advance(s, { scaffold: { title: "2", chapter: 2 } });
    s = advance(s, { prose: "p" });
    s = advance(s); // ingest
    s = advance(s); // → done
    expect(s.phase).toBe("done");
  });

  it("throws on unknown phase", () => {
    expect(() => advance({ phase: "??" })).toThrow(/unknown phase/);
  });
});

describe("runDeterministicPhases", () => {
  it("is a no-op past the bible phase", () => {
    let s = createPipelineState({ selections: sampleSelections });
    s = runDeterministicPhases(s);
    expect(s.phase).toBe("bible");
    const again = runDeterministicPhases(s);
    expect(again.phase).toBe("bible");
  });
});
