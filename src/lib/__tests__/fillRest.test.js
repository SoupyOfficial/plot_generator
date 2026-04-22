// src/lib/__tests__/fillRest.test.js
import { describe, it, expect } from "vitest";
import {
  collectEmptyFields,
  buildFillPrompt,
  parseFillResponse,
  applyFillResult,
} from "../fillRest.js";

const LAYERS = [
  {
    id: "macro",
    groups: [
      {
        id: "world",
        components: [
          { id: "a", label: "A field", options: ["A1", "A2"] },
          { id: "b", label: "B field", options: [{ value: "B1", description: "first" }, "B2"] },
          { id: "notes", label: "Notes", freeform: true },
          { id: "list", label: "List", multi: true, options: ["x", "y"] },
        ],
      },
    ],
  },
];

describe("collectEmptyFields", () => {
  it("returns only empty single-select fields with options", () => {
    const out = collectEmptyFields(LAYERS, { a: "A1" });
    expect(out.map((f) => f.fieldId)).toEqual(["b"]);
    expect(out[0].options).toEqual(["B1", "B2"]);
  });

  it("skips multi and freeform", () => {
    const out = collectEmptyFields(LAYERS, {});
    const ids = out.map((f) => f.fieldId);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).not.toContain("notes");
    expect(ids).not.toContain("list");
  });
});

describe("buildFillPrompt", () => {
  it("includes current choices and remaining fields", () => {
    const { system, user, emptyFieldIds } = buildFillPrompt({
      layers: LAYERS,
      selections: { a: "A1" },
      userNotes: "keep it cozy",
    });
    expect(system).toMatch(/allow-list/i);
    expect(user).toMatch(/A1/);
    expect(user).toMatch(/B1/);
    expect(user).toMatch(/keep it cozy/);
    expect(emptyFieldIds).toEqual(["b"]);
  });

  it("handles empty selections (everything remains)", () => {
    const { user } = buildFillPrompt({ layers: LAYERS, selections: {} });
    expect(user).toMatch(/\(none yet\)/);
  });
});

describe("parseFillResponse", () => {
  it("accepts valid values in allow-list", () => {
    const res = parseFillResponse('{"a":"A2","b":"B1"}', LAYERS);
    expect(res.accepted).toEqual({ a: "A2", b: "B1" });
    expect(res.rejected).toEqual([]);
  });

  it("rejects values not in allow-list", () => {
    const res = parseFillResponse('{"a":"NOT_REAL"}', LAYERS);
    expect(res.accepted).toEqual({});
    expect(res.rejected[0]).toMatchObject({
      fieldId: "a",
      reason: "value-not-in-allow-list",
    });
  });

  it("rejects unknown fields and unsupported types", () => {
    const res = parseFillResponse('{"nope":"x","notes":"hi","list":["x"]}', LAYERS);
    expect(res.accepted).toEqual({});
    const reasons = res.rejected.map((r) => r.reason);
    expect(reasons).toContain("unknown-field");
    expect(reasons).toContain("unsupported-field-type");
  });

  it("strips markdown fences and parses", () => {
    const res = parseFillResponse('```json\n{"a":"A1"}\n```', LAYERS);
    expect(res.accepted).toEqual({ a: "A1" });
  });

  it("recovers JSON from surrounding prose", () => {
    const res = parseFillResponse('Here you go: {"a":"A1"} — hope this helps!', LAYERS);
    expect(res.accepted).toEqual({ a: "A1" });
  });

  it("returns unparseable when there is no JSON", () => {
    const res = parseFillResponse("total garbage", LAYERS);
    expect(res.accepted).toEqual({});
    expect(res.rejected[0].reason).toBe("unparseable");
  });
});

describe("applyFillResult", () => {
  it("merges accepted fills", () => {
    const out = applyFillResult({ a: "A1" }, { b: "B1" });
    expect(out).toEqual({ a: "A1", b: "B1" });
  });

  it("never overwrites existing values", () => {
    const out = applyFillResult({ a: "A1" }, { a: "A2", b: "B1" });
    expect(out.a).toBe("A1");
    expect(out.b).toBe("B1");
  });

  it("does not mutate input", () => {
    const input = { a: "A1" };
    applyFillResult(input, { b: "B1" });
    expect(input).toEqual({ a: "A1" });
  });
});
