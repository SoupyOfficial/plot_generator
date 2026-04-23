import { describe, it, expect } from "vitest";
import { detectProvider, pingLlm } from "../llmPing.js";
import { resolveLiveLlmKey } from "./__helpers__/resolveLiveKey.js";

// Resolved from: env vars (LLM_TEST_KEY / LLM_API_KEY / OPENAI_API_KEY /
// CLAUDE_API_KEY / ANTHROPIC_API_KEY), import.meta.env.VITE_LLM_TEST_KEY, or
// the repo's .env (which is already gitignored). Skipped if none present.
const KEY = resolveLiveLlmKey();

describe("llmPing (pure helpers)", () => {
  it("detects Anthropic prefix", () => {
    expect(detectProvider("sk-ant-abc")).toBe("anthropic");
  });
  it("detects OpenAI prefixes", () => {
    expect(detectProvider("sk-proj-abc")).toBe("openai");
    expect(detectProvider("sk-abc")).toBe("openai");
  });
  it("rejects unknown keys", () => {
    expect(detectProvider("")).toBe(null);
    expect(detectProvider("garbage")).toBe(null);
  });
});

// Opt-in live test. Skipped when no key is provided so CI and ordinary
// `npm test` runs stay hermetic and free.
const describeLive = KEY ? describe : describe.skip;

describeLive("llmPing (LIVE — costs ~a few tokens)", () => {
  it(
    "round-trips a minimal prompt against the real provider",
    async () => {
      const result = await pingLlm(KEY);
      expect(result.ok).toBe(true);
      expect(["anthropic", "openai"]).toContain(result.provider);
      expect(typeof result.text).toBe("string");
      expect(result.text.length).toBeGreaterThan(0);
      // Sanity: not a ridiculous latency (guards against hangs).
      expect(result.latencyMs).toBeLessThan(30_000);
      // eslint-disable-next-line no-console
      console.log(
        `[live] ${result.provider} (${result.model}) → "${result.text.trim()}" in ${result.latencyMs}ms`
      );
    },
    45_000
  );
});
