// src/lib/contract.js
//
// Phase 9: Story Contract.
//
// A versioned, exportable, importable artifact representing the locked
// structural decisions for a story. Underpins the Series Plan (Phase 11),
// Story Bible (Phase 12), and Chapter Planner (Phase 13).
//
// Design notes:
//   - All operations are pure functions. No DOM access here.
//   - Backwards compat handled via `migrateContract`. Bump CONTRACT_VERSION
//     and add a migration whenever the shape changes.
//   - URL-share encoding uses URL-safe base64 so it works as a hash fragment.

export const CONTRACT_VERSION = "1.0";

/**
 * @typedef {Object} StoryContract
 * @property {string} version
 * @property {string} id
 * @property {string} createdAt   ISO 8601
 * @property {string} updatedAt   ISO 8601
 * @property {string} pack        genre pack id (default "litrpg-base")
 * @property {Object} selections  field id → value | value[]
 * @property {string[]} warnings  validation snapshot at lock time
 * @property {string} [brief]     structured brief markdown
 * @property {Array}  [beats]     15-beat plan (free-form objects)
 * @property {string} [themeArgument]
 * @property {string} [userNotes]
 */

/**
 * Cheap RFC4122-ish uuid; fine for client-side ids. Avoids `crypto` dep.
 */
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a fresh contract. All fields except `selections` are optional.
 *
 * @param {Object} input
 * @param {Object} input.selections
 * @param {string[]} [input.warnings]
 * @param {string} [input.brief]
 * @param {Array} [input.beats]
 * @param {string} [input.themeArgument]
 * @param {string} [input.userNotes]
 * @param {string} [input.pack]
 * @returns {StoryContract}
 */
export function createContract({
  selections,
  warnings = [],
  brief,
  beats,
  themeArgument,
  userNotes,
  pack = "litrpg-base",
} = {}) {
  const now = new Date().toISOString();
  const c = {
    version: CONTRACT_VERSION,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    pack,
    selections: { ...(selections || {}) },
    warnings: [...warnings],
  };
  if (brief != null) c.brief = brief;
  if (beats != null) c.beats = beats;
  if (themeArgument != null) c.themeArgument = themeArgument;
  if (userNotes != null) c.userNotes = userNotes;
  return c;
}

/**
 * Update a contract immutably. Bumps `updatedAt`.
 */
export function updateContract(contract, patch) {
  return {
    ...contract,
    ...patch,
    selections: patch.selections
      ? { ...contract.selections, ...patch.selections }
      : contract.selections,
    updatedAt: new Date().toISOString(),
    version: contract.version, // version is changed only by migrateContract
    id: contract.id,
    createdAt: contract.createdAt,
  };
}

export function serializeContract(contract) {
  return JSON.stringify(contract, null, 2);
}

/**
 * Parse JSON into a contract, running migrations as needed.
 * Returns { contract, errors } — never throws on bad input.
 */
export function parseContract(text) {
  try {
    const raw = typeof text === "string" ? JSON.parse(text) : text;
    if (!raw || typeof raw !== "object") {
      return { contract: null, errors: ["not-an-object"] };
    }
    const errors = [];
    if (!raw.version) errors.push("missing-version");
    if (!raw.selections || typeof raw.selections !== "object") {
      errors.push("missing-selections");
    }
    if (errors.length) return { contract: null, errors };
    const migrated = migrateContract(raw);
    return { contract: migrated, errors: [] };
  } catch (e) {
    return { contract: null, errors: ["unparseable", String(e?.message || e)] };
  }
}

/**
 * Migrate older contract shapes forward. Add a case per version bump.
 */
export function migrateContract(contract) {
  if (!contract) return contract;
  let c = { ...contract };
  if (!c.version) c.version = "1.0";
  // v0.x → 1.0: ensure id/createdAt/updatedAt exist, default pack.
  if (!c.id) c.id = uuid();
  if (!c.createdAt) c.createdAt = new Date().toISOString();
  if (!c.updatedAt) c.updatedAt = c.createdAt;
  if (!c.pack) c.pack = "litrpg-base";
  if (!Array.isArray(c.warnings)) c.warnings = [];
  if (!c.selections || typeof c.selections !== "object") c.selections = {};
  return c;
}

/**
 * Render a contract as a human-readable Markdown document. Mirrors the
 * structured brief but adds metadata + warnings.
 */
export function exportMarkdown(contract) {
  if (!contract) return "";
  const lines = [];
  lines.push(`# Story Contract`);
  lines.push("");
  lines.push(`- **Version:** ${contract.version}`);
  lines.push(`- **Pack:** ${contract.pack}`);
  lines.push(`- **Created:** ${contract.createdAt}`);
  lines.push(`- **Updated:** ${contract.updatedAt}`);
  lines.push(`- **Id:** \`${contract.id}\``);
  lines.push("");

  if (contract.themeArgument) {
    lines.push(`## Theme argument`);
    lines.push("");
    lines.push(`> ${contract.themeArgument}`);
    lines.push("");
  }

  lines.push(`## Selections`);
  lines.push("");
  const entries = Object.entries(contract.selections || {});
  if (!entries.length) {
    lines.push("_(none)_");
  } else {
    for (const [k, v] of entries) {
      if (Array.isArray(v)) {
        lines.push(`- **${k}:**`);
        for (const x of v) lines.push(`  - ${x}`);
      } else if (v != null && v !== "") {
        lines.push(`- **${k}:** ${v}`);
      }
    }
  }
  lines.push("");

  if (contract.brief) {
    lines.push(`## Structured brief`);
    lines.push("");
    lines.push(contract.brief);
    lines.push("");
  }

  if (Array.isArray(contract.beats) && contract.beats.length) {
    lines.push(`## Beat plan`);
    lines.push("");
    contract.beats.forEach((b, i) => {
      const title = b?.title || b?.name || `Beat ${i + 1}`;
      const body = b?.content || b?.description || "";
      lines.push(`### ${i + 1}. ${title}`);
      if (body) {
        lines.push("");
        lines.push(body);
      }
      lines.push("");
    });
  }

  if (Array.isArray(contract.warnings) && contract.warnings.length) {
    lines.push(`## Active warnings at lock time`);
    lines.push("");
    for (const w of contract.warnings) lines.push(`- ⚠ ${w}`);
    lines.push("");
  }

  if (contract.userNotes) {
    lines.push(`## Author notes`);
    lines.push("");
    lines.push(contract.userNotes);
    lines.push("");
  }

  return lines.join("\n");
}

// ----- URL share encoding ---------------------------------------------------

/**
 * URL-safe base64 of a UTF-8 string.
 */
function b64UrlEncode(str) {
  // Use TextEncoder where available; fall back to manual UTF-8.
  let bytes;
  if (typeof TextEncoder !== "undefined") {
    bytes = new TextEncoder().encode(str);
  } else {
    bytes = unescape(encodeURIComponent(str));
  }
  let b64;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    let s = "";
    if (typeof bytes === "string") s = bytes;
    else for (const b of bytes) s += String.fromCharCode(b);
    b64 = btoa(s);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlDecode(b64url) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  let bytesStr;
  if (typeof Buffer !== "undefined") {
    bytesStr = Buffer.from(b64, "base64").toString("binary");
  } else {
    bytesStr = atob(b64);
  }
  if (typeof TextDecoder !== "undefined") {
    const arr = new Uint8Array(bytesStr.length);
    for (let i = 0; i < bytesStr.length; i++) arr[i] = bytesStr.charCodeAt(i);
    return new TextDecoder().decode(arr);
  }
  return decodeURIComponent(escape(bytesStr));
}

/**
 * Pack a contract into a URL-safe hash fragment string.
 */
export function toShareHash(contract) {
  if (!contract) return "";
  return b64UrlEncode(serializeContract(contract));
}

/**
 * Inverse of toShareHash. Returns { contract, errors }.
 */
export function fromShareHash(hash) {
  if (!hash || typeof hash !== "string") {
    return { contract: null, errors: ["empty"] };
  }
  try {
    const json = b64UrlDecode(hash.replace(/^#/, ""));
    return parseContract(json);
  } catch (e) {
    return { contract: null, errors: ["decode-failed", String(e?.message || e)] };
  }
}
