// Test-only helper: resolve the live LLM key from a few sensible locations so
// devs don't have to rename env vars just to run the smoke test.
// Order:
//   1. process.env.LLM_TEST_KEY       (explicit, highest priority)
//   2. process.env.LLM_API_KEY        (matches existing .env convention)
//   3. process.env.OPENAI_API_KEY / CLAUDE_API_KEY
//   4. import.meta.env.VITE_LLM_TEST_KEY (if someone prefers the VITE_ flavor)
//   5. parse .env at the repo root for the same keys (Vitest doesn't populate
//      process.env from Vite's env loader for non-VITE_ names).
import fs from "node:fs";
import path from "node:path";

const ENV_NAMES = [
  "LLM_TEST_KEY",
  "LLM_API_KEY",
  "OPENAI_API_KEY",
  "CLAUDE_API_KEY",
  "ANTHROPIC_API_KEY",
];

function fromProcess() {
  for (const name of ENV_NAMES) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function fromViteEnv() {
  try {
    // eslint-disable-next-line no-undef
    const v = import.meta.env?.VITE_LLM_TEST_KEY;
    return v && v.trim() ? v.trim() : "";
  } catch {
    return "";
  }
}

function fromDotenv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return "";
    const contents = fs.readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const name = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (ENV_NAMES.includes(name) && value) return value;
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function resolveLiveLlmKey() {
  return fromProcess() || fromViteEnv() || fromDotenv() || "";
}
