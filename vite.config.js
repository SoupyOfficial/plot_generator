import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs/promises";

const LAST_SELECTION_FILE = "last-selection.json";
const SELECTION_HISTORY_FILE = "selection-history.json";
const DEFAULT_API_KEY_ENDPOINT = "/api/default-api-key";
const SELECTION_HISTORY_ENDPOINT = "/api/selection-history";
const HISTORY_LIMIT = 10;

const hasMeaningfulValue = (value) => {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return value !== null && value !== undefined;
};

const hasMeaningfulSelections = (selections) => {
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) return false;
  return Object.values(selections).some(hasMeaningfulValue);
};

const toCanonicalJson = (value) => {
  const normalize = (v) => {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === "object") {
      return Object.keys(v)
        .sort()
        .reduce((acc, key) => {
          acc[key] = normalize(v[key]);
          return acc;
        }, {});
    }
    return v;
  };

  return JSON.stringify(normalize(value));
};

function selectionPersistencePlugin() {
  let projectRoot = process.cwd();

  const sendJson = (res, statusCode, payload) => {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  };

  const readBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  };

  const registerHandlers = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url || !req.method) return next();

      const pathname = req.url.split("?")[0];
      const historyFilePath = path.join(projectRoot, SELECTION_HISTORY_FILE);

      const readHistoryEntries = async () => {
        try {
          const raw = await fs.readFile(historyFilePath, "utf8");
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return [];
          return parsed.filter((item) => item && typeof item === "object");
        } catch (error) {
          if (error?.code === "ENOENT") return [];
          throw error;
        }
      };

      const appendHistoryEntry = async (selections) => {
        const existing = await readHistoryEntries();

        if (!hasMeaningfulSelections(selections)) {
          return {
            historyEntries: existing.slice(0, HISTORY_LIMIT),
            historyUpdated: false,
            skippedReason: "empty",
          };
        }

        const latest = existing[0];
        if (latest?.selections && toCanonicalJson(latest.selections) === toCanonicalJson(selections)) {
          return {
            historyEntries: existing.slice(0, HISTORY_LIMIT),
            historyUpdated: false,
            skippedReason: "duplicate",
          };
        }

        const next = [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            timestamp: new Date().toISOString(),
            selections,
          },
          ...existing,
        ].slice(0, HISTORY_LIMIT);

        await fs.writeFile(historyFilePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
        return {
          historyEntries: next,
          historyUpdated: true,
          skippedReason: null,
        };
      };

      if (pathname === DEFAULT_API_KEY_ENDPOINT) {
        if (req.method !== "GET") {
          return sendJson(res, 405, { ok: false, message: "Method not allowed" });
        }

        const sources = [
          { name: "LLM_API_KEY", value: process.env.LLM_API_KEY },
          { name: "CLAUDE_API_KEY", value: process.env.CLAUDE_API_KEY },
          { name: "OPENAI_API_KEY", value: process.env.OPENAI_API_KEY },
        ];

        const selected = sources.find((s) => (s.value || "").trim().length > 0);

        if (!selected) {
          return sendJson(res, 404, {
            ok: false,
            message: "No API key found in .env",
            checked: sources.map((s) => s.name),
          });
        }

        return sendJson(res, 200, {
          ok: true,
          apiKey: selected.value,
          source: selected.name,
        });
      }

      if (pathname === SELECTION_HISTORY_ENDPOINT) {
        if (req.method !== "GET") {
          return sendJson(res, 405, { ok: false, message: "Method not allowed" });
        }

        const entries = await readHistoryEntries();
        return sendJson(res, 200, {
          ok: true,
          entries: entries.slice(0, HISTORY_LIMIT),
          file: SELECTION_HISTORY_FILE,
        });
      }

      if (pathname !== "/api/last-selection") return next();

      const filePath = path.join(projectRoot, LAST_SELECTION_FILE);

      try {
        if (req.method === "GET") {
          const raw = await fs.readFile(filePath, "utf8");
          const selections = JSON.parse(raw);
          if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
            return sendJson(res, 500, {
              ok: false,
              message: "last-selection.json is not a valid selection object",
            });
          }
          return sendJson(res, 200, { ok: true, selections, file: LAST_SELECTION_FILE });
        }

        if (req.method === "POST") {
          const body = await readBody(req);
          const parsed = JSON.parse(body || "{}");
          const selections = parsed?.selections;

          if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
            return sendJson(res, 400, {
              ok: false,
              message: "Request body must include an object at `selections`",
            });
          }

          await fs.writeFile(filePath, `${JSON.stringify(selections, null, 2)}\n`, "utf8");
          const {
            historyEntries,
            historyUpdated,
            skippedReason,
          } = await appendHistoryEntry(selections);
          return sendJson(res, 200, {
            ok: true,
            file: LAST_SELECTION_FILE,
            historyEntries,
            historyUpdated,
            skippedReason,
            historyFile: SELECTION_HISTORY_FILE,
          });
        }

        return sendJson(res, 405, { ok: false, message: "Method not allowed" });
      } catch (error) {
        if (req.method === "GET" && error?.code === "ENOENT") {
          return sendJson(res, 404, {
            ok: false,
            message: "No saved selection file found yet",
            file: LAST_SELECTION_FILE,
          });
        }
        return sendJson(res, 500, { ok: false, message: error?.message || String(error) });
      }
    });
  };

  return {
    name: "selection-persistence",
    configResolved(config) {
      projectRoot = config.root;
    },
    configureServer(server) {
      registerHandlers(server.middlewares);
    },
    configurePreviewServer(server) {
      registerHandlers(server.middlewares);
    },
  };
}

// On GitHub Actions the GITHUB_ACTIONS env var is always "true".
// We need the repo-name base so asset paths resolve correctly on GitHub Pages.
// In local dev this stays "/" so nothing changes.
const base = process.env.GITHUB_ACTIONS === "true" ? "/plot_generator/" : "/";

export default defineConfig({
  base,
  plugins: [react(), selectionPersistencePlugin()],
  test: {
    // Keep Vitest focused on unit tests; Playwright owns tests/e2e.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
});
