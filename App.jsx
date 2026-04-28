import { useState, useMemo, useEffect, useRef } from "react";
import { SYSTEM_STORY_DESIGN } from "./system_story_data";
import {
  normalizeOption,
  optionValue,
  buildFieldIndex,
  conflictsForOption,
} from "./src/lib/options.js";
import { validateSelections } from "./src/lib/validation.js";
import { buildGenerationPrompt } from "./src/lib/prompt.js";
import { detectHighValueCombos } from "./src/lib/prompt.js";
import { computeCoherence } from "./src/lib/coherence.js";
import { PRESETS, findPreset } from "./src/data/presets.js";
import { applyPreset, conflictsForPreset } from "./src/lib/presets.js";
import { assertKnownTags } from "./src/data/tags.js";
import {
  buildFillPrompt,
  parseFillResponse,
  applyFillResult,
  collectEmptyFields,
} from "./src/lib/fillRest.js";
import { detectCombos, newlyTriggered } from "./src/lib/combos.js";
import { computeRarity } from "./src/lib/rarity.js";
import {
  rollDice as rollDiceLogic,
  getRerollBudget,
  consumeReroll,
  resetRerollBudget,
  DEFAULT_REROLL_BUDGET,
} from "./src/lib/randomize.js";
import {
  findCompanion,
  renderCompanionsSection,
} from "./src/lib/companions.js";
import {
  resolveRungs,
  normalizePins,
  describePins,
} from "./src/lib/ladder.js";
import {
  readXp,
  addXp,
  buildWeakSpotsPrompt,
  parseWeakSpotsResponse,
  XP_PER_WEAK_SPOT_FIXED,
  XP_PER_GENERATION,
  XP_PER_BANGER_COHERENCE,
} from "./src/lib/levelUp.js";
import {
  CoherenceMeter,
  ComboToasts,
  RarityBadge,
  WeakSpots,
  XpBar,
  RollDiceButton,
  DraftModePanel,
  CompanionBuilder,
  ProgressionLadder,
  GamifyStyles,
} from "./src/components/gamify.jsx";
import { PipelineCockpit } from "./src/components/pipelineCockpit.jsx";
import {
  WizardShell,
  ModeToggle,
  DraftRecoveryBanner,
} from "./src/components/wizard.jsx";
import { StageFlow } from "./src/components/stageFlow.jsx";
import { ProjectPicker } from "./src/components/projectPicker.jsx";
import { L1Seed } from "./src/components/stages/l1Seed.jsx";
import { L2Promise } from "./src/components/stages/l2Promise.jsx";
import { L3ShortStory } from "./src/components/stages/l3ShortStory.jsx";
import { L4Novella } from "./src/components/stages/l4Novella.jsx";
import { L5Novel } from "./src/components/stages/l5Novel.jsx";
import { L6Chapters } from "./src/components/stages/l6Chapters.jsx";
import {
  buildSteps as buildWizardSteps,
  loadDraft as loadWizardDraft,
  saveDraft as saveWizardDraft,
  clearDraft as clearWizardDraft,
  loadWizardState,
  saveWizardState,
  loadViewMode,
  saveViewMode,
  hasDraft as hasWizardDraft,
  firstIncompleteIndex as firstIncompleteWizardStep,
} from "./src/lib/wizard.js";
import { LAYERS } from "./src/data/layers.js";
import {
  createContract,
  serializeContract,
  parseContract,
  exportMarkdown as exportContractMarkdown,
  toShareHash,
  fromShareHash,
} from "./src/lib/contract.js";
import {
  buildReverseEngineerPrompt,
  parseReverseEngineerResponse,
} from "./src/lib/reverseEngineer.js";
import { createStorage } from "./src/lib/storage/index.js";

// ============================================================================
// COMPONENT DATA — moved to ./src/data/layers.js (Phase 14 prep).
// SYSTEM_STORY_DESIGN stays imported here because it's read elsewhere in this
// file (presets, summaries); LAYERS itself derives the option lists internally.
// ============================================================================

// ============================================================================
// COMPATIBILITY RULES — from "COMPATIBILITY RULES" section of story_anatomy.docx
// Real implementation lives in src/lib/validation.js (hybrid: data-driven
// `forbids` on option objects + cross-cutting multi-field rules).
// ============================================================================

function validate(s) {
  return validateSelections(s, LAYERS);
}

// ============================================================================
// LLM API CALLS (Anthropic + OpenAI via API key auto-detection)
// ============================================================================

function detectProviderFromApiKey(apiKey) {
  const key = (apiKey || "").trim();
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("sk-proj-") || key.startsWith("sk-")) return "openai";
  return null;
}

// `buildGenerationPrompt` now lives in src/lib/prompt.js. We build a per-call
// context object so we can pass selections + warnings + user notes together.
function buildPromptContext(selections, activeWarnings, userNotes) {
  return buildGenerationPrompt({
    layers: LAYERS,
    selections,
    systemDesign: SYSTEM_STORY_DESIGN,
    activeWarnings,
    userNotes,
  });
}

function parseStructuredJson(text) {
  const cleaned = (text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callAnthropic(apiKey, selections, extra = {}) {
  const { system, user } = buildPromptContext(
    selections,
    extra.activeWarnings,
    extra.userNotes
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return parseStructuredJson(text);
}

async function callOpenAI(apiKey, selections, extra = {}) {
  const { system, user } = buildPromptContext(
    selections,
    extra.activeWarnings,
    extra.userNotes
  );

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return parseStructuredJson(text);
}

async function callModel(apiKey, selections, extra = {}) {
  const provider = detectProviderFromApiKey(apiKey);

  if (provider === "anthropic") {
    return callAnthropic(apiKey, selections, extra);
  }
  if (provider === "openai") {
    return callOpenAI(apiKey, selections, extra);
  }

  throw new Error("Unknown API key format. Use an Anthropic key (sk-ant-...) or OpenAI key (sk-... / sk-proj-...).");
}

// --- FILL-THE-REST: raw text round-trip (no JSON parsing of the main schema) -

async function callModelRawText(apiKey, { system, user }, opts = {}) {
  const json = opts.json !== false; // default true (back-compat)
  const maxTokens = opts.maxTokens || 1500;
  const provider = detectProviderFromApiKey(apiKey);
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text || "";
  }
  if (provider === "openai") {
    const body = {
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (json) body.response_format = { type: "json_object" };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }
  throw new Error("Unknown API key format.");
}

// ============================================================================
// STYLES
// ============================================================================

const COLOR = {
  bg: "#0a0a0f",
  panel: "rgba(255,255,255,0.02)",
  text: "#e2e0f0",
  muted: "#7c78a0",
  dim: "#6b6890",
  purple: "#8a5cf6",
  purpleSoft: "#a78bfa",
  purpleLight: "#c4b5fd",
  border: "rgba(138,92,246,0.25)",
  borderStrong: "rgba(138,92,246,0.6)",
  red: "#f87171",
  redBorder: "rgba(248,113,113,0.5)",
  redBg: "rgba(248,113,113,0.08)",
  green: "#4ade80",
  greenBorder: "rgba(74,222,128,0.5)",
  greenBg: "rgba(74,222,128,0.08)",
  cyan: "#38bdf8",
};

const FONT = "'Courier New', Courier, monospace";
const LAST_SELECTION_ENDPOINT = "/api/last-selection";
const DEFAULT_API_KEY_ENDPOINT = "/api/default-api-key";
const SELECTION_HISTORY_ENDPOINT = "/api/selection-history";
const HISTORY_LIMIT = 10;
const LOCAL_LAST_SELECTION_KEY = "plot_generator:last-selection";
const LOCAL_SELECTION_HISTORY_KEY = "plot_generator:selection-history";
const IS_STATIC_HOSTING =
  typeof window !== "undefined" &&
  /(?:github|gitlab)\.io$/i.test(window.location.hostname);

const hasMeaningfulValue = (value) => {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return value !== null && value !== undefined;
};

const hasMeaningfulSelections = (nextSelections) => {
  if (!nextSelections || typeof nextSelections !== "object" || Array.isArray(nextSelections)) return false;
  return Object.values(nextSelections).some(hasMeaningfulValue);
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

const readLocalHistoryEntries = () => {
  try {
    const raw = localStorage.getItem(LOCAL_SELECTION_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
};

const writeLocalHistoryEntries = (entries) => {
  try {
    localStorage.setItem(LOCAL_SELECTION_HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // ignore storage failures (quota/private mode)
  }
};

const appendLocalHistoryEntry = (nextSelections) => {
  const existing = readLocalHistoryEntries();

  if (!hasMeaningfulSelections(nextSelections)) {
    return {
      historyEntries: existing.slice(0, HISTORY_LIMIT),
      historyUpdated: false,
      skippedReason: "empty",
    };
  }

  const latest = existing[0];
  if (latest?.selections && toCanonicalJson(latest.selections) === toCanonicalJson(nextSelections)) {
    return {
      historyEntries: existing.slice(0, HISTORY_LIMIT),
      historyUpdated: false,
      skippedReason: "duplicate",
    };
  }

  const updated = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      selections: nextSelections,
    },
    ...existing,
  ].slice(0, HISTORY_LIMIT);

  writeLocalHistoryEntries(updated);

  return {
    historyEntries: updated,
    historyUpdated: true,
    skippedReason: null,
  };
};

const S = {
  root: {
    minHeight: "100vh",
    background: COLOR.bg,
    color: COLOR.text,
    fontFamily: FONT,
    position: "relative",
    overflowX: "hidden",
  },
  grid: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    backgroundImage:
      "linear-gradient(rgba(138,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(138,92,246,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  orb1: {
    position: "fixed",
    top: "-120px",
    left: "20%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(138,92,246,0.15), transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  orb2: {
    position: "fixed",
    bottom: "-80px",
    right: "10%",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "960px",
    margin: "0 auto",
    padding: "0 24px 96px",
  },
  header: {
    padding: "48px 0 32px",
    borderBottom: `1px solid ${COLOR.border}`,
  },
  eyebrow: {
    fontSize: "10px",
    letterSpacing: "4px",
    color: COLOR.purple,
    marginBottom: "10px",
  },
  h1: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 36px)",
    fontWeight: 400,
    letterSpacing: "2px",
    lineHeight: 1.3,
  },
  subtitle: {
    marginTop: "16px",
    fontSize: "13px",
    color: COLOR.muted,
    lineHeight: 1.7,
  },
  layerCard: {
    marginTop: "16px",
    border: `1px solid ${COLOR.border}`,
    background: COLOR.panel,
    borderRadius: "3px",
    overflow: "hidden",
  },
  layerHeader: {
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    userSelect: "none",
    background: "rgba(138,92,246,0.04)",
  },
  layerNum: {
    fontSize: "10px",
    letterSpacing: "3px",
    color: COLOR.purple,
    minWidth: "60px",
  },
  layerTitle: {
    fontSize: "15px",
    color: COLOR.text,
    letterSpacing: "1px",
    flex: 1,
  },
  layerSubtitle: {
    fontSize: "11px",
    color: COLOR.dim,
    marginTop: "4px",
  },
  layerBody: {
    padding: "20px",
    borderTop: `1px solid ${COLOR.border}`,
  },
  groupTitle: {
    fontSize: "11px",
    color: COLOR.dim,
    letterSpacing: "3px",
    textTransform: "uppercase",
    marginTop: "18px",
    marginBottom: "10px",
  },
  fieldLabel: {
    display: "block",
    fontSize: "11px",
    color: COLOR.purpleSoft,
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "6px",
    marginTop: "12px",
  },
  select: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "13px",
    borderRadius: "2px",
    outline: "none",
  },
  multiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "6px",
  },
  chip: (on) => ({
    padding: "8px 12px",
    fontSize: "12px",
    border: `1px solid ${on ? COLOR.borderStrong : COLOR.border}`,
    background: on ? "rgba(138,92,246,0.15)" : "rgba(0,0,0,0.25)",
    color: on ? COLOR.purpleLight : COLOR.muted,
    cursor: "pointer",
    borderRadius: "2px",
    fontFamily: FONT,
    textAlign: "left",
    transition: "all 0.15s",
  }),
  warnBox: {
    marginTop: "24px",
    border: `1px solid ${COLOR.redBorder}`,
    background: COLOR.redBg,
    padding: "16px 18px",
    borderRadius: "3px",
  },
  warnTitle: {
    fontSize: "11px",
    color: COLOR.red,
    letterSpacing: "3px",
    marginBottom: "10px",
  },
  warnItem: {
    fontSize: "12px",
    color: "#fca5a5",
    lineHeight: 1.6,
    marginBottom: "8px",
  },
  generateBtn: (disabled) => ({
    marginTop: "24px",
    width: "100%",
    padding: "16px",
    background: disabled ? "rgba(138,92,246,0.1)" : "rgba(138,92,246,0.2)",
    border: `1px solid ${disabled ? COLOR.border : COLOR.borderStrong}`,
    color: disabled ? COLOR.dim : COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "13px",
    letterSpacing: "4px",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: "2px",
  }),
  actionRow: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "stretch",
  },
  utilityBtn: {
    padding: "12px 16px",
    background: "rgba(0,0,0,0.35)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "12px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: "2px",
    minWidth: "240px",
  },
  statusLine: {
    marginTop: "10px",
    fontSize: "11px",
    color: COLOR.dim,
    letterSpacing: "1px",
  },
  historyRow: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "stretch",
  },
  historySelect: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
  },
  restoreBtn: {
    padding: "10px 14px",
    background: "rgba(138,92,246,0.15)",
    border: `1px solid ${COLOR.borderStrong}`,
    color: COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: "2px",
    minWidth: "220px",
  },
  output: {
    marginTop: "28px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(0,0,0,0.4)",
    padding: "24px",
    borderRadius: "3px",
    position: "relative",
  },
  copyBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(138,92,246,0.15)",
    border: `1px solid ${COLOR.borderStrong}`,
    color: COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "10px",
    letterSpacing: "2px",
    padding: "6px 10px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  apiKeyRow: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  apiKeyInput: {
    flex: 1,
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "8px 10px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
  },
  notesTextarea: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
    minHeight: "90px",
    resize: "vertical",
    boxSizing: "border-box",
  },
  freeformInput: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
    boxSizing: "border-box",
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function Field({ comp, value, onChange, fieldIndex, selections }) {
  // Freeform text input — no options, just captures a string.
  if (comp.freeform) {
    return (
      <div>
        <label style={S.fieldLabel}>{comp.label}</label>
        <input
          type="text"
          style={S.freeformInput}
          value={value || ""}
          placeholder={comp.placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // Normalize mixed string|object options up front so the rest of this
  // component doesn't care which form the data was declared in.
  const normalized = (comp.options || [])
    .map(normalizeOption)
    .filter(Boolean);

  // Compute per-option conflict state against current selections. If non-empty,
  // the option is rendered as disabled with a tooltip explaining the conflict.
  const conflictMap = new Map();
  for (const opt of normalized) {
    const conflicts = fieldIndex
      ? conflictsForOption(fieldIndex, selections || {}, comp.id, opt)
      : [];
    conflictMap.set(opt.value, conflicts);
  }

  const conflictTooltip = (conflicts) =>
    conflicts
      .map(
        (c) =>
          `Incompatible with ${c.otherField} = "${c.currentValue}"`
      )
      .join(" • ");

  if (comp.multi) {
    const set = new Set(value || []);
    return (
      <div>
        <label style={S.fieldLabel}>
          {comp.label} <span style={{ color: COLOR.dim }}>({set.size} selected{comp.min ? `, min ${comp.min}` : ""}{comp.max ? `, max ${comp.max}` : ""})</span>
        </label>
        <div style={S.multiGrid}>
          {normalized.map((o) => {
            const on = set.has(o.value);
            const conflicts = conflictMap.get(o.value) || [];
            const disabled = !on && conflicts.length > 0;
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                title={
                  disabled
                    ? conflictTooltip(conflicts)
                    : o.description || undefined
                }
                onClick={() => {
                  if (disabled) return;
                  const next = new Set(set);
                  if (on) next.delete(o.value);
                  else {
                    if (comp.max && next.size >= comp.max) return;
                    next.add(o.value);
                  }
                  onChange([...next]);
                }}
                style={{
                  ...S.chip(on),
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {on ? "▣ " : disabled ? "⊘ " : "▢ "} {o.value}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  // Single-select: keep <select> UI. Forbidden options are `disabled` attribute.
  const currentOpt = normalized.find((o) => o.value === value);
  return (
    <div>
      <label style={S.fieldLabel} title={currentOpt?.description || undefined}>
        {comp.label}
        {currentOpt?.description && (
          <span style={{ marginLeft: 8, color: COLOR.dim, textTransform: "none", letterSpacing: 0 }}>
            — {currentOpt.description}
          </span>
        )}
      </label>
      <select
        style={S.select}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {normalized.map((o) => {
          const conflicts = conflictMap.get(o.value) || [];
          const disabled = o.value !== value && conflicts.length > 0;
          return (
            <option
              key={o.value}
              value={o.value}
              disabled={disabled}
              title={
                disabled
                  ? conflictTooltip(conflicts)
                  : o.description || undefined
              }
            >
              {disabled ? "⊘ " : ""}{o.value}
              {disabled ? "  (conflicts)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function CoherenceBadge({ coherence }) {
  if (!coherence) return null;
  const colorByLabel = {
    Banger: COLOR.purple,
    "Query-Ready": COLOR.purpleSoft,
    Workshop: "#d4a843",
    "Rough Draft": "#c45c5c",
  };
  const accent = colorByLabel[coherence.label] || COLOR.purpleSoft;
  const b = coherence.breakdown;
  const tooltip =
    `Score: ${coherence.score}/100\n` +
    `Completeness: ${b.completeness} (${b.filled}/${b.requiredTotal} required, subplots ${b.subplotOk ? "OK" : "out-of-range"})\n` +
    `Compatibility: ${b.compatibility} (${b.warnings} warning${b.warnings === 1 ? "" : "s"})\n` +
    `Cohesion bonus: +${b.cohesionBonus} (${b.highValueCombos} high-value combo${b.highValueCombos === 1 ? "" : "s"})`;
  return (
    <div
      title={tooltip}
      style={{
        marginTop: "18px",
        padding: "12px 16px",
        border: `1px solid ${accent}`,
        background: "rgba(0,0,0,0.3)",
        borderRadius: "3px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: accent,
          letterSpacing: "3px",
        }}
      >
        // COHERENCE
      </div>
      <div
        style={{
          fontSize: "14px",
          color: accent,
          letterSpacing: "2px",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {coherence.label}
      </div>
      <div style={{ fontSize: "12px", color: COLOR.dim, flex: 1 }}>
        {coherence.blurb}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: COLOR.dim,
          letterSpacing: "1px",
        }}
      >
        hover for details
      </div>
    </div>
  );
}

function Layer({ layer, selections, setSelection, open, onToggle, fieldIndex }) {
  return (
    <div style={S.layerCard}>
      <div style={S.layerHeader} onClick={onToggle}>
        <div style={S.layerNum}>LAYER {layer.num}</div>
        <div style={{ flex: 1 }}>
          <div style={S.layerTitle}>{layer.title}</div>
          <div style={S.layerSubtitle}>{layer.subtitle}</div>
        </div>
        <div style={{ color: COLOR.purple, fontSize: "14px" }}>{open ? "▼" : "▶"}</div>
      </div>
      {open && (
        <div style={S.layerBody}>
          {layer.informational && (
            <div style={{ fontSize: "12px", color: COLOR.muted, lineHeight: 1.7 }}>
              The beat structure (Opening Image → Final Image) is synthesized automatically
              from your selections across Layers 1, 2, 4, and 8 when you click{" "}
              <span style={{ color: COLOR.purpleLight }}>GENERATE SEED</span>.
            </div>
          )}
          {layer.groups.map((g) => (
            <div key={g.id}>
              <div style={S.groupTitle}>{g.title}</div>
              {g.components.map((c) => (
                <Field
                  key={c.id}
                  comp={c}
                  value={selections[c.id]}
                  onChange={(v) => setSelection(c.id, v)}
                  fieldIndex={fieldIndex}
                  selections={selections}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  // ── Storage adapter (for multi-project StageFlow mode) ────────────────
  const [storageAdapter, setStorageAdapter] = useState(null);
  
  useEffect(() => {
    // Initialize storage adapter asynchronously (lazy-loads drizzle-orm only when needed)
    createStorage()
      .then(adapter => setStorageAdapter(adapter))
      .catch(err => {
        console.error("Failed to create storage adapter:", err);
        setStorageAdapter(null);
      });
  }, []);

  // ── Project ID state (for StageFlow mode) ─────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState(() => {
    try {
      return localStorage.getItem("stageflow:current-project") || null;
    } catch {
      return null;
    }
  });

  // Persist current project ID to localStorage
  useEffect(() => {
    if (currentProjectId) {
      try {
        localStorage.setItem("stageflow:current-project", currentProjectId);
      } catch { /* noop */ }
    } else {
      try {
        localStorage.removeItem("stageflow:current-project");
      } catch { /* noop */ }
    }
  }, [currentProjectId]);

  // ── Existing state ─────────────────────────────────────────────────────
  const [selections, setSelections] = useState({});
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetStatus, setPresetStatus] = useState("");
  const [userNotes, setUserNotes] = useState(() => localStorage.getItem("user_notes") || "");
  const [openLayers, setOpenLayers] = useState({ macro: true });
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("llm_api_key") || localStorage.getItem("anthropic_key") || ""
  );
  const [selectionFileStatus, setSelectionFileStatus] = useState("No saved selection loaded yet.");
  const [keyStatus, setKeyStatus] = useState("STORED LOCALLY");
  const [selectionHistory, setSelectionHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [fillLoading, setFillLoading] = useState(false);
  const [fillStatus, setFillStatus] = useState("");  const outputRef = useRef(null);
  const hasSelectionInitialized = useRef(false);
  const contractFileRef = useRef(null);
  // ── Gamification state ────────────────────────────────────────────────
  const [comboToasts, setComboToasts] = useState([]); // {key, label}
  const toastKeyRef = useRef(0);
  const [rerollBudget, setRerollBudget] = useState(() => {
    try { return getRerollBudget(); } catch { return DEFAULT_REROLL_BUDGET; }
  });
  const [rolling, setRolling] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [xp, setXp] = useState(() => { try { return readXp(); } catch { return 0; } });
  const [weakSpots, setWeakSpots] = useState(null); // null = not requested, [] = returned empty
  const [weakSpotsLoading, setWeakSpotsLoading] = useState(false);
  const [fixedWeakSpotIds, setFixedWeakSpotIds] = useState([]);
  const lastScoreRef = useRef(null);
  const [scoreDelta, setScoreDelta] = useState(0);

  // ── Wizard / view-mode state ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState(() => {
    try { return loadViewMode(localStorage, "wizard"); } catch { return "wizard"; }
  });
  const [wizardStepIndex, setWizardStepIndex] = useState(() => {
    try { return loadWizardState(localStorage).stepIndex || 0; } catch { return 0; }
  });
  const [draftInfo, setDraftInfo] = useState(null); // { selections, savedAt } | null
  const draftCheckedRef = useRef(false);
  const draftSaveTimer = useRef(null);

  // Persist mode + step to localStorage.
  useEffect(() => {
    try { saveViewMode(viewMode, localStorage); } catch { /* noop */ }
  }, [viewMode]);
  useEffect(() => {
    try {
      const cur = loadWizardState(localStorage);
      saveWizardState({ ...cur, stepIndex: wizardStepIndex }, localStorage);
    } catch { /* noop */ }
  }, [wizardStepIndex]);

  // Detect a draft on mount and prompt the user.
  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;
    try {
      const draft = loadWizardDraft(localStorage);
      if (hasWizardDraft(draft)) {
        const ws = loadWizardState(localStorage);
        setDraftInfo({ selections: draft, savedAt: ws.lastSavedAt || 0 });
      }
    } catch { /* noop */ }
  }, []);

  // Autosave selections to a draft slot on every change (debounced).
  useEffect(() => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      try { saveWizardDraft(selections || {}, localStorage); } catch { /* noop */ }
    }, 400);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [selections]);

  // Built once: ordered wizard steps over the current LAYERS.
  const wizardSteps = useMemo(() => buildWizardSteps(LAYERS), []);

  // Render a single wizard step's body. Power mode renders everything
  // inline; this callback is only used when viewMode === "wizard".
  function renderWizardStep(step) {
    if (step.kind === "preset") {
      return (
        <div
          style={{
            padding: "14px 16px",
            border: `1px solid ${COLOR.border}`,
            background: "rgba(138,92,246,0.05)",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: COLOR.purple,
              letterSpacing: "3px",
              marginBottom: "10px",
            }}
          >
            // OPTIONAL — START FROM A PRESET
          </div>
          <div style={S.historyRow}>
            <select
              style={S.historySelect}
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
            >
              <option value="">— choose a subgenre starting point —</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={S.restoreBtn}
              onClick={handleApplyPreset}
              disabled={!selectedPresetId}
            >
              ▸ APPLY PRESET
            </button>
          </div>
          {selectedPresetId && (
            <div style={{ ...S.statusLine, marginTop: "8px" }}>
              {findPreset(selectedPresetId)?.description}
            </div>
          )}
          {presetStatus && (
            <div style={{ ...S.statusLine, marginTop: "4px", color: COLOR.purpleLight }}>
              {presetStatus}
            </div>
          )}
          <div style={{ ...S.statusLine, marginTop: "10px", color: COLOR.dim }}>
            You can skip this and pick everything by hand.
          </div>
        </div>
      );
    }

    if (step.kind === "layer") {
      const layerId = step.layerIds[0];
      const layer = LAYERS.find((l) => l.id === layerId);
      if (!layer) return null;
      return (
        <div>
          <Layer
            layer={layer}
            selections={selections}
            setSelection={setSelection}
            open={true}
            onToggle={() => {}}
            fieldIndex={fieldIndex}
          />
          {layer.id === "mid" && (
            <ProgressionLadder
              selections={selections}
              setPins={(pins) =>
                setSelections((prev) => ({ ...prev, progressionPins: pins }))
              }
            />
          )}
          {layer.id === "protagonist" && (
            <CompanionBuilder
              selections={selections}
              setCompanions={(ids) =>
                setSelections((prev) => ({ ...prev, companions: ids }))
              }
            />
          )}
        </div>
      );
    }

    // review
    return (
      <div>
        <CoherenceMeter coherence={coherence} lastDelta={scoreDelta} />

        {warnings.length > 0 && (
          <div style={S.warnBox}>
            <div style={S.warnTitle}>⚠ COMPATIBILITY WARNINGS ({warnings.length})</div>
            {warnings.map((w, i) => (
              <div key={i} style={S.warnItem}>→ {w}</div>
            ))}
          </div>
        )}

        {!ready && (
          <div style={{ ...S.warnBox, borderColor: COLOR.border, background: "rgba(138,92,246,0.05)" }}>
            <div style={{ ...S.warnTitle, color: COLOR.purpleSoft }}>◇ INCOMPLETE</div>
            {missing.length > 0 && (
              <div style={S.warnItem}>
                Missing selections: {missing.length} required field
                {missing.length === 1 ? "" : "s"} ({missing.join(", ")}).
              </div>
            )}
            {!subplotOk && (
              <div style={S.warnItem}>
                Subplots: pick 2–4 (currently {(selections.subplots || []).length}).
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "16px" }}>
          <label style={{ ...S.fieldLabel, marginTop: 0 }}>
            User Notes (optional) — passed verbatim to the model
          </label>
          <textarea
            style={S.notesTextarea}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Character names, settings, imagery, things to avoid, tone references…"
          />
        </div>

        <div style={{ ...S.statusLine, marginTop: "10px", color: COLOR.dim }}>
          The footer below has the GENERATE button. Other utilities (fill the
          rest, dice, draft mode, export, share) live in POWER mode.
        </div>
      </div>
    );
  }

  // Memoized field index; used by Field to compute per-option conflict state.
  const fieldIndex = useMemo(() => buildFieldIndex(LAYERS), []);

  // Dev-time: warn if any option carries a tag not in the allow-list.
  useEffect(() => {
    assertKnownTags(LAYERS);
  }, []);

  // Auto-import a contract from #contract=... share link on first load.
  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const m = hash.match(/contract=([^&]+)/);
      if (!m) return;
      const c = fromShareHash(m[1]);
      if (!c) return;
      setSelections(c.selections || {});
      if (typeof c.userNotes === "string") setUserNotes(c.userNotes);
      setSelectionFileStatus(`Loaded contract from share link (id ${c.id.slice(0, 8)}…).`);
      // Strip hash so a refresh doesn't re-apply it.
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch { /* noop */ }
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("user_notes", userNotes || "");
  }, [userNotes]);

  useEffect(() => {
    if (apiKey) localStorage.setItem("llm_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;

    if (IS_STATIC_HOSTING) {
      setKeyStatus("STORED LOCALLY (STATIC HOSTING)");
      return () => {
        cancelled = true;
      };
    }

    async function loadDefaultApiKey() {
      try {
        const res = await fetch(DEFAULT_API_KEY_ENDPOINT);
        const payload = await res.json();

        if (!res.ok || !payload?.ok || !payload?.apiKey) return;

        if (!cancelled) {
          setApiKey(payload.apiKey);
          setKeyStatus(`AUTO-LOADED: ${payload.source}`);
        }
      } catch {
        if (!cancelled) {
          setKeyStatus("STORED LOCALLY");
        }
      }
    }

    loadDefaultApiKey();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (IS_STATIC_HOSTING) {
      const entries = readLocalHistoryEntries();
      if (!cancelled) {
        setSelectionHistory(entries.slice(0, HISTORY_LIMIT));
        setSelectedHistoryId((prev) => prev || entries[0]?.id || "");
      }
      return () => {
        cancelled = true;
      };
    }

    async function loadHistory() {
      try {
        const res = await fetch(SELECTION_HISTORY_ENDPOINT);
        const payload = await res.json();
        if (!res.ok || !payload?.ok || !Array.isArray(payload?.entries)) return;

        if (!cancelled) {
          setSelectionHistory(payload.entries);
          setSelectedHistoryId((prev) => prev || payload.entries[0]?.id || "");
        }
      } catch {
        // history is optional; ignore fetch failures
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  function pushToast(label) {
    toastKeyRef.current += 1;
    const key = toastKeyRef.current;
    setComboToasts((prev) => [...prev, { key, label }]);
    setTimeout(() => {
      setComboToasts((prev) => prev.filter((t) => t.key !== key));
    }, 4500);
  }

  function applySelections(updater) {
    setSelections((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        const fresh = newlyTriggered(prev, next);
        if (fresh?.length) {
          for (const c of fresh) pushToast(`◆ COMBO UNLOCKED · ${c.label}`);
        }
      } catch {
        /* ignore combo errors */
      }
      return next;
    });
  }

  const setSelection = (id, v) =>
    applySelections((p) => ({ ...p, [id]: v }));

  useEffect(() => {
    if (!hasSelectionInitialized.current) {
      hasSelectionInitialized.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (IS_STATIC_HOSTING) {
          localStorage.setItem(LOCAL_LAST_SELECTION_KEY, JSON.stringify(selections));

          const { historyEntries, historyUpdated, skippedReason } = appendLocalHistoryEntry(selections);

          let status = "Saved locally (static hosting mode).";
          if (historyUpdated === false) {
            if (skippedReason === "empty") {
              status += " Skipped history snapshot (empty selection).";
            } else if (skippedReason === "duplicate") {
              status += " Skipped history snapshot (unchanged from latest).";
            }
          }
          setSelectionFileStatus(status);
          setSelectionHistory(historyEntries.slice(0, HISTORY_LIMIT));
          setSelectedHistoryId((prev) => prev || historyEntries[0]?.id || "");
          return;
        }

        const res = await fetch(LAST_SELECTION_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selections }),
        });
        const payload = await res.json();
        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.message || "Failed to save last selection");
        }

        let status = "Saved to last-selection.json in project root.";
        if (payload?.historyUpdated === false) {
          if (payload?.skippedReason === "empty") {
            status += " Skipped history snapshot (empty selection).";
          } else if (payload?.skippedReason === "duplicate") {
            status += " Skipped history snapshot (unchanged from latest).";
          }
        }
        setSelectionFileStatus(status);

        if (Array.isArray(payload?.historyEntries)) {
          setSelectionHistory(payload.historyEntries.slice(0, HISTORY_LIMIT));
          setSelectedHistoryId((prev) => prev || payload.historyEntries[0]?.id || "");
        }
      } catch (e) {
        setSelectionFileStatus(`Save failed: ${e.message || String(e)}`);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selections]);

  const toggleLayer = (id) =>
    setOpenLayers((p) => ({ ...p, [id]: !p[id] }));

  function handleApplyPreset() {
    if (!selectedPresetId) return;
    const preset = findPreset(selectedPresetId);
    if (!preset) {
      setPresetStatus(`Unknown preset: ${selectedPresetId}`);
      return;
    }

    // Blank preset = reset. Confirm if user already has any selections.
    if (preset.id === "blank") {
      const hasAny = Object.values(selections).some(
        (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      if (hasAny) {
        const ok = window.confirm(
          "Clear all current selections and start from a blank slate?"
        );
        if (!ok) {
          setPresetStatus("Preset apply canceled.");
          return;
        }
      }
      setSelections({});
      setPresetStatus(`Cleared selections.`);
      return;
    }

    const conflicts = conflictsForPreset(selections, preset);
    if (conflicts.length > 0) {
      const lines = conflicts
        .map((c) => `  • ${c.fieldId}: "${c.current}" → "${c.next}"`)
        .join("\n");
      const ok = window.confirm(
        `Applying "${preset.label}" will replace ${conflicts.length} conflicting selection(s):\n\n${lines}\n\nProceed?`
      );
      if (!ok) {
        setPresetStatus("Preset apply canceled.");
        return;
      }
    }

    setSelections((prev) => applyPreset(prev, preset, { replaceConflicting: true }));
    const changed = Object.keys(preset.selections).length;
    setPresetStatus(
      `Applied "${preset.label}" (${changed} field${changed === 1 ? "" : "s"} set).`
    );
  }

  const warnings = useMemo(() => validate(selections), [selections]);

  // Required non-multi fields for "ready to generate"
  // Required non-multi fields for "ready to generate"
  const requiredIds = [
    "subgenre",
    "integrationType", "worldScale", "techLevel",
    "systemVisibility", "systemOrigin", "systemPurpose", "systemAlignment", "systemCeiling",
    "entryCondition", "startingState", "knowledgeAdvantage",
    "primaryConflict", "conflictOrigin",
    "resolutionMode", "protagonistOutcome",
    "archetype", "flawType", "primaryTheme",
  ];
  const missing = requiredIds.filter((id) => !selections[id]);
  const subplotOk = (selections.subplots || []).length >= 2 && (selections.subplots || []).length <= 4;
  const ready = missing.length === 0 && subplotOk;

  // Coherence rating — qualitative label primary, numeric in tooltip.
  const coherence = useMemo(
    () =>
      computeCoherence({
        requiredIds,
        selections,
        warnings,
        subplotCount: (selections.subplots || []).length,
        highValueCombos: detectHighValueCombos(SYSTEM_STORY_DESIGN, selections).length,
      }),
    [requiredIds, selections, warnings]
  );

  // Track score-to-score delta so the meter can flash +N / -N.
  useEffect(() => {
    if (!coherence) return;
    if (lastScoreRef.current == null) {
      lastScoreRef.current = coherence.score;
      return;
    }
    const delta = coherence.score - lastScoreRef.current;
    lastScoreRef.current = coherence.score;
    if (delta !== 0) {
      setScoreDelta(delta);
      const tid = setTimeout(() => setScoreDelta(0), 900);
      return () => clearTimeout(tid);
    }
  }, [coherence?.score]);

  // Rarity — live from current selections (shown alongside output).
  const rarity = useMemo(
    () =>
      computeRarity({
        layers: LAYERS,
        selections,
        systemDesign: SYSTEM_STORY_DESIGN,
        warningsCount: warnings.length,
      }),
    [selections, warnings]
  );

  function buildExtraNotes() {
    const parts = [];
    const companions = selections.companions || [];
    if (companions.length) {
      const section = renderCompanionsSection(companions);
      if (section) parts.push(section);
    }
    const rungs = resolveRungs(selections);
    if (rungs.length) {
      const pins = normalizePins(selections.progressionPins, rungs.length);
      if (pins) {
        const line = describePins(rungs, pins);
        if (line) parts.push(`## Progression Pacing\n${line}. Beat structure should honor these milestones.`);
      }
    }
    return parts.length ? parts.join("\n\n") : "";
  }

  async function handleGenerate() {
    setError(null);
    setOutput(null);
    setWeakSpots(null);
    setFixedWeakSpotIds([]);
    if (!apiKey) {
      setError("API key required (Anthropic or OpenAI).");
      return;
    }
    setLoading(true);
    try {
      const extra = buildExtraNotes();
      const mergedNotes = [userNotes, extra].filter(Boolean).join("\n\n");
      const result = await callModel(apiKey, selections, {
        activeWarnings: warnings,
        userNotes: mergedNotes,
      });
      setOutput({ ...result, selections });

      // XP: generation reward + coherence bonus
      let gained = XP_PER_GENERATION;
      if (coherence?.label === "Banger") gained += XP_PER_BANGER_COHERENCE;
      setXp(addXp(gained));
      if (gained > XP_PER_GENERATION) pushToast(`✦ +${gained} XP · Banger coherence bonus!`);

      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleFillRest() {
    setFillStatus("");
    if (!apiKey) {
      setFillStatus("API key required to fill the rest.");
      return;
    }
    const empties = collectEmptyFields(LAYERS, selections);
    if (!empties.length) {
      setFillStatus("Nothing to fill — all single-select fields already set.");
      return;
    }
    setFillLoading(true);
    try {
      const { system, user } = buildFillPrompt({
        layers: LAYERS,
        selections,
        userNotes,
      });
      const text = await callModelRawText(apiKey, { system, user });
      const { accepted, rejected } = parseFillResponse(text, LAYERS);
      const acceptedCount = Object.keys(accepted).length;
      if (!acceptedCount) {
        setFillStatus(
          `Fill returned no valid suggestions (${rejected.length} rejected). Try again or fill manually.`
        );
        return;
      }
      setSelections((prev) => applyFillResult(prev, accepted));
      const rejectedNote = rejected.length
        ? ` (${rejected.length} rejected — not in allow-list)`
        : "";
      setFillStatus(
        `Filled ${acceptedCount} field${acceptedCount === 1 ? "" : "s"}${rejectedNote}.`
      );
    } catch (e) {
      setFillStatus(`Fill failed: ${e.message || String(e)}`);
    } finally {
      setFillLoading(false);
    }
  }

  // ── Roll the dice: staggered reveal (single-select only) ──
  async function handleRollDice() {
    if (rolling) return;
    if (rerollBudget <= 0) return;
    const { selections: nextAll, changed } = rollDiceLogic({
      layers: LAYERS,
      selections,
      overwrite: false,
    });
    if (!changed.length) {
      pushToast("✦ Nothing to roll — all single-select fields are already set.");
      return;
    }
    setRolling(true);
    const remaining = consumeReroll();
    setRerollBudget(remaining);

    let step = 0;
    for (const id of changed) {
      const delay = step * 180;
      setTimeout(() => {
        applySelections((prev) => ({ ...prev, [id]: nextAll[id] }));
        if (step === changed.length - 1) {
          setTimeout(() => setRolling(false), 200);
        }
      }, delay);
      step += 1;
    }
  }

  function handleResetBudget() {
    const n = resetRerollBudget();
    setRerollBudget(n);
  }

  // ── Draft Mode commit ──
  function handleDraftCommit(nextAll) {
    applySelections(() => ({ ...nextAll }));
    setDraftOpen(false);
    pushToast("✦ Draft mode complete");
  }

  // ── Level-up weak spots ──
  async function handleFetchWeakSpots() {
    if (!apiKey || !output) return;
    setWeakSpotsLoading(true);
    try {
      const extra = buildExtraNotes();
      const mergedNotes = [userNotes, extra].filter(Boolean).join("\n\n");
      const { buildGenerationPrompt } = await import("./src/lib/prompt.js");
      const { user: brief } = buildGenerationPrompt({
        layers: LAYERS,
        selections,
        systemDesign: SYSTEM_STORY_DESIGN,
        activeWarnings: warnings,
        userNotes: mergedNotes,
      });
      const { system, user } = buildWeakSpotsPrompt({ brief, selections });
      const text = await callModelRawText(apiKey, { system, user });
      const parsed = parseWeakSpotsResponse(text);
      setWeakSpots(parsed);
      setFixedWeakSpotIds([]);
    } catch (e) {
      setWeakSpots([]);
      setError(e.message || String(e));
    } finally {
      setWeakSpotsLoading(false);
    }
  }

  function handleFixWeakSpot(id, weakSpot) {
    setFixedWeakSpotIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setXp(addXp(XP_PER_WEAK_SPOT_FIXED));
    pushToast(`✦ +${XP_PER_WEAK_SPOT_FIXED} XP · weak spot fixed`);
    // Open and scroll to the implicated layer if we can find the field
    if (weakSpot?.field) {
      const fieldId = Object.keys(fieldIndex).find(
        (k) => k === weakSpot.field || fieldIndex[k]?.label === weakSpot.field
      );
      if (fieldId) {
        for (const layer of LAYERS) {
          const found = layer.groups?.some((g) =>
            g.components?.some((c) => c.id === fieldId)
          );
          if (found) {
            setOpenLayers((prev) => ({ ...prev, [layer.id]: true }));
            break;
          }
        }
      }
    }
  }

  function buildCopyText() {
    const lines = [];
    lines.push("═══════════════════════════════════════════");
    lines.push("  STORY SEED");
    lines.push("═══════════════════════════════════════════\n");
    lines.push(output.seed, "");
    lines.push("── LOCKED SYSTEM ─────────────────────────");
    lines.push(`Origin:    ${selections.systemOrigin || "—"}`);
    lines.push(`Purpose:   ${selections.systemPurpose || "—"}`);
    lines.push(`Alignment: ${selections.systemAlignment || "—"}`);
    lines.push(`Ceiling:   ${selections.systemCeiling || "—"}`);
    lines.push("");
    lines.push("── PROTAGONIST ───────────────────────────");
    lines.push(`Archetype: ${selections.archetype || "—"}`);
    lines.push(`Entry:     ${selections.entryCondition || "—"}`);
    lines.push(`Start:     ${selections.startingState || "—"}`);
    lines.push(`Knowledge: ${selections.knowledgeAdvantage || "—"}`);
    lines.push(`Flaw:      ${selections.flawType || "—"} — ${selections.flawArc || "—"}`);
    lines.push("");
    lines.push("── CONFLICT & ENDING (LOCKED) ────────────");
    lines.push(`Conflict:  ${selections.primaryConflict || "—"}`);
    lines.push(`Origin:    ${selections.conflictOrigin || "—"}`);
    lines.push(`Resolution:${selections.resolutionMode || "—"}`);
    lines.push(`Outcome:   ${selections.protagonistOutcome || "—"}`);
    lines.push("");
    lines.push("── THEMATIC QUESTION ─────────────────────");
    lines.push(output.themeQuestion || themeQuestion(selections));
    lines.push("");
    lines.push("── SUBPLOTS ──────────────────────────────");
    (selections.subplots || []).forEach((s) => lines.push(`• ${s}`));
    lines.push("");
    lines.push("── BEAT MAP (Save the Cat × your system) ─");
    (output.beats || []).forEach((b) => {
      lines.push(`\n[${b.name}]`);
      lines.push(b.description);
    });
    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCopyText());
  }

  async function handleLoadLastSelection() {
    try {
      if (IS_STATIC_HOSTING) {
        const raw = localStorage.getItem(LOCAL_LAST_SELECTION_KEY);
        if (!raw) {
          throw new Error("No saved selection found in local storage");
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Saved local selection is invalid");
        }
        setSelections(parsed);
        setSelectionFileStatus("Loaded from local storage (static hosting mode).");
        return;
      }

      const res = await fetch(LAST_SELECTION_ENDPOINT);
      const payload = await res.json();

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || "Unable to load last selection");
      }

      setSelections(payload.selections || {});
      setSelectionFileStatus("Loaded from last-selection.json.");
    } catch (e) {
      setSelectionFileStatus(`Load failed: ${e.message || String(e)}`);
    }
  }

  // ── Contract I/O (Solo Author Cockpit) ──────────────────────────────
  function currentContract() {
    return createContract({
      selections,
      userNotes: userNotes || undefined,
    });
  }

  function downloadBlob(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportContractJson() {
    try {
      const c = currentContract();
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(`contract-${ts}.json`, serializeContract(c), "application/json");
      setSelectionFileStatus("Exported contract JSON.");
    } catch (e) {
      setSelectionFileStatus(`Export failed: ${e.message || String(e)}`);
    }
  }

  function handleExportContractMarkdown() {
    try {
      const c = currentContract();
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(`contract-${ts}.md`, exportContractMarkdown(c), "text/markdown");
      setSelectionFileStatus("Exported contract Markdown.");
    } catch (e) {
      setSelectionFileStatus(`Export failed: ${e.message || String(e)}`);
    }
  }

  function handleImportContractFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () =>
      setSelectionFileStatus("Import failed: could not read file.");
    reader.onload = () => {
      const { contract, errors } = parseContract(String(reader.result || ""));
      if (errors.length || !contract) {
        setSelectionFileStatus(`Import failed: ${errors.join(", ") || "invalid"}`);
        return;
      }
      setSelections(contract.selections || {});
      if (typeof contract.userNotes === "string") setUserNotes(contract.userNotes);
      setSelectionFileStatus(`Imported contract (id ${contract.id.slice(0, 8)}…).`);
    };
    reader.readAsText(file);
  }

  async function handleCopyShareLink() {
    try {
      const c = currentContract();
      const hash = toShareHash(c);
      const url = `${window.location.origin}${window.location.pathname}#contract=${hash}`;
      await navigator.clipboard.writeText(url);
      setSelectionFileStatus("Share link copied to clipboard.");
    } catch (e) {
      setSelectionFileStatus(`Share link failed: ${e.message || String(e)}`);
    }
  }

  function formatHistoryLabel(entry, index) {
    const ts = entry?.timestamp ? new Date(entry.timestamp) : null;
    const readable = ts && !Number.isNaN(ts.valueOf())
      ? ts.toLocaleString()
      : "Unknown time";
    return `${index + 1}. ${readable}`;
  }

  function handleRestoreHistorySnapshot() {
    const selected = selectionHistory.find((item) => item.id === selectedHistoryId);
    if (!selected?.selections) {
      setSelectionFileStatus("No history snapshot selected.");
      return;
    }

    setSelections(selected.selections);
    setSelectionFileStatus(`Restored snapshot from ${new Date(selected.timestamp).toLocaleString()}.`);
  }

  return (
    <div style={S.root}>
      <GamifyStyles />
      <PipelineCockpit
        selections={selections}
        userNotes={userNotes}
        apiKey={apiKey}
        callRawLLM={callModelRawText}
        layers={LAYERS}
        onApplyReverse={(mapped) => setSelections((prev) => ({ ...prev, ...mapped }))}
      />
      <ComboToasts
        toasts={comboToasts}
        onDismiss={(key) => setComboToasts((prev) => prev.filter((t) => t.key !== key))}
      />
      <div style={S.grid} />
      <div style={S.orb1} />
      <div style={S.orb2} />

      <div style={S.container}>
        <div style={S.header}>
          <div style={S.eyebrow}>PROGRESSION FANTASY · v1.0</div>
          <h1 style={S.h1}>
            STORY SEED GENERATOR
            <br />
            <span style={{ color: COLOR.purple }}>// LITRPG ARCHITECTURE</span>
          </h1>
          <p style={S.subtitle}>
            Work through layers 1–8. Each selection constrains the next. The ending is locked
            before writing begins. Compatibility rules run live. The model synthesizes the final
            blurb and maps your selections onto the 15 Save-the-Cat beats.
          </p>
          <form
            style={S.apiKeyRow}
            onSubmit={(e) => e.preventDefault()}
            autoComplete="off"
          >
            <input
              type="password"
              name="apiKey"
              placeholder="API key (Anthropic sk-ant-... or OpenAI sk-... / sk-proj-...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={S.apiKeyInput}
            />
            <span style={{ fontSize: "10px", color: COLOR.dim, letterSpacing: "2px" }}>
              {keyStatus}
            </span>
            <XpBar xp={xp} />
          </form>
        </div>

        {draftInfo && (
          <DraftRecoveryBanner
            savedAt={draftInfo.savedAt}
            onResume={() => {
              applySelections(() => draftInfo.selections || {});
              setDraftInfo(null);
              setSelectionFileStatus("Resumed unsaved draft.");
            }}
            onDiscard={() => {
              try { clearWizardDraft(localStorage); } catch { /* noop */ }
              setDraftInfo(null);
              setSelectionFileStatus("Discarded unsaved draft.");
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", margin: "0 0 12px" }}>
          <ModeToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {viewMode === "wizard" && (
          <WizardShell
            steps={wizardSteps}
            stepIndex={wizardStepIndex}
            onStepChange={setWizardStepIndex}
            selections={selections}
            renderStep={renderWizardStep}
            canGenerate
            generateDisabled={!ready || loading}
            generateLabel={loading ? "◌ GENERATING…" : "▶ GENERATE SEED"}
            onGenerate={handleGenerate}
          />
        )}

        {viewMode === "power" && (
        <>
        <div
          style={{
            marginTop: "16px",
            marginBottom: "20px",
            padding: "14px 16px",
            border: `1px solid ${COLOR.border}`,
            background: "rgba(138,92,246,0.05)",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: COLOR.purple,
              letterSpacing: "3px",
              marginBottom: "10px",
            }}
          >
            // START FROM A PRESET (OPTIONAL)
          </div>
          <div style={S.historyRow}>
            <select
              style={S.historySelect}
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
            >
              <option value="">— choose a subgenre starting point —</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={S.restoreBtn}
              onClick={handleApplyPreset}
              disabled={!selectedPresetId}
            >
              ▸ APPLY PRESET
            </button>
          </div>
          {selectedPresetId && (
            <div style={{ ...S.statusLine, marginTop: "8px" }}>
              {findPreset(selectedPresetId)?.description}
            </div>
          )}
          {presetStatus && (
            <div style={{ ...S.statusLine, marginTop: "4px", color: COLOR.purpleLight }}>
              {presetStatus}
            </div>
          )}
        </div>

        {LAYERS.map((layer) => (
          <div key={layer.id}>
            <Layer
              layer={layer}
              selections={selections}
              setSelection={setSelection}
              open={!!openLayers[layer.id]}
              onToggle={() => toggleLayer(layer.id)}
              fieldIndex={fieldIndex}
            />
            {openLayers[layer.id] && layer.id === "mid" && (
              <ProgressionLadder
                selections={selections}
                setPins={(pins) =>
                  setSelections((prev) => ({ ...prev, progressionPins: pins }))
                }
              />
            )}
            {openLayers[layer.id] && layer.id === "protagonist" && (
              <CompanionBuilder
                selections={selections}
                setCompanions={(ids) =>
                  setSelections((prev) => ({ ...prev, companions: ids }))
                }
              />
            )}
          </div>
        ))}

        <CoherenceMeter coherence={coherence} lastDelta={scoreDelta} />

        {warnings.length > 0 && (
          <div style={S.warnBox}>
            <div style={S.warnTitle}>⚠ COMPATIBILITY WARNINGS ({warnings.length})</div>
            {warnings.map((w, i) => (
              <div key={i} style={S.warnItem}>→ {w}</div>
            ))}
          </div>
        )}

        {!ready && (
          <div style={{ ...S.warnBox, borderColor: COLOR.border, background: "rgba(138,92,246,0.05)" }}>
            <div style={{ ...S.warnTitle, color: COLOR.purpleSoft }}>◇ INCOMPLETE</div>
            {missing.length > 0 && (
              <div style={S.warnItem}>
                Missing selections: {missing.length} fields remain across layers 1, 2, 4, 8.
              </div>
            )}
            {!subplotOk && (
              <div style={S.warnItem}>
                Subplots: pick 2–4 (currently {(selections.subplots || []).length}).
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <label style={{ ...S.fieldLabel, marginTop: 0 }}>
            User Notes (optional) — passed verbatim to the model
          </label>
          <textarea
            style={S.notesTextarea}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Character names, settings, imagery, things to avoid, tone references… (stored locally in your browser)"
          />
        </div>

        <div style={S.actionRow}>
          <button
            style={S.generateBtn(!ready || loading)}
            disabled={!ready || loading}
            onClick={handleGenerate}
          >
            {loading ? "◌ GENERATING…" : "▶ GENERATE SEED"}
          </button>
          <button
            type="button"
            onClick={handleFillRest}
            style={S.utilityBtn}
            disabled={loading || fillLoading || !apiKey}
            title={!apiKey ? "API key required" : "Let the model fill remaining empty fields"}
          >
            {fillLoading ? "◌ FILLING…" : "✨ FILL THE REST"}
          </button>
          <RollDiceButton
            budget={rerollBudget}
            rolling={rolling}
            onRoll={handleRollDice}
            disabled={loading || fillLoading}
          />
          <button
            type="button"
            onClick={() => setDraftOpen(true)}
            style={S.utilityBtn}
            disabled={loading || fillLoading || rolling}
            title="Draft mode: pick from a 3-card hand for each field"
          >
            🎴 DRAFT MODE
          </button>
          {rerollBudget <= 0 && (
            <button
              type="button"
              onClick={handleResetBudget}
              style={S.utilityBtn}
              title="Reset session re-roll budget"
            >
              ↻ RESET BUDGET
            </button>
          )}
          <button
            type="button"
            onClick={handleLoadLastSelection}
            style={S.utilityBtn}
            disabled={loading}
          >
            ↺ LOAD LAST SELECTION
          </button>
          <button
            type="button"
            onClick={handleExportContractJson}
            style={S.utilityBtn}
            disabled={loading}
            title="Download the current selections as a versioned contract.json"
          >
            ⬇ EXPORT (JSON)
          </button>
          <button
            type="button"
            onClick={handleExportContractMarkdown}
            style={S.utilityBtn}
            disabled={loading}
            title="Download the current contract as a human-readable Markdown brief"
          >
            ⬇ EXPORT (MD)
          </button>
          <button
            type="button"
            onClick={() => contractFileRef.current?.click()}
            style={S.utilityBtn}
            disabled={loading}
            title="Import a previously-saved contract.json"
          >
            ⬆ IMPORT
          </button>
          <button
            type="button"
            onClick={handleCopyShareLink}
            style={S.utilityBtn}
            disabled={loading}
            title="Copy a shareable URL that encodes the current contract"
          >
            🔗 SHARE LINK
          </button>
          <input
            ref={contractFileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              handleImportContractFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {fillStatus && (
          <div style={{ ...S.statusLine, color: COLOR.purpleLight }}>{fillStatus}</div>
        )}
        <div style={S.historyRow}>
          <select
            style={S.historySelect}
            value={selectedHistoryId}
            onChange={(e) => setSelectedHistoryId(e.target.value)}
            disabled={selectionHistory.length === 0 || loading}
          >
            <option value="">— history (latest 10) —</option>
            {selectionHistory.slice(0, HISTORY_LIMIT).map((entry, i) => (
              <option key={entry.id} value={entry.id}>
                {formatHistoryLabel(entry, i)}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={S.restoreBtn}
            onClick={handleRestoreHistorySnapshot}
            disabled={!selectedHistoryId || loading}
          >
            ↺ RESTORE SELECTED
          </button>
        </div>
        <div style={S.statusLine}>{selectionFileStatus}</div>
        </>
        )}

        {viewMode === "stageflow" && storageAdapter && (
          <StageFlow
            storage={storageAdapter}
            currentProjectId={currentProjectId}
            onProjectChange={setCurrentProjectId}
            renderStage={(stage, props) => {
              // Map stage IDs to stage panel components
              switch (stage) {
                case "l1":
                  return <L1Seed {...props} />;
                case "l2":
                  return <L2Promise {...props} />;
                case "l3":
                  return <L3ShortStory {...props} onGenerate={handleGenerate} />;
                case "l4":
                  return <L4Novella />;
                case "l5":
                  return <L5Novel />;
                case "l6":
                  return <L6Chapters {...props} />;
                default:
                  return (
                    <div style={{ padding: "40px", textAlign: "center", color: COLOR.muted }}>
                      Unknown stage: {stage}
                    </div>
                  );
              }
            }}
          />
        )}

        {viewMode === "stageflow" && !storageAdapter && (
          <div style={{ padding: "40px", textAlign: "center", color: COLOR.red }}>
            <p>⚠ Storage adapter initialization failed</p>
            <p style={{ fontSize: "12px", color: COLOR.muted }}>
              StageFlow mode requires a valid storage adapter. Check console for errors.
            </p>
          </div>
        )}

        {error && (
          <div style={{ ...S.warnBox, marginTop: "16px" }}>
            <div style={S.warnTitle}>✗ ERROR</div>
            <div style={S.warnItem}>{error}</div>
          </div>
        )}

        {output && (
          <div style={S.output} ref={outputRef}>
            <button style={S.copyBtn} onClick={handleCopy}>COPY</button>
            <div style={{ fontSize: "10px", color: COLOR.purple, letterSpacing: "3px", marginBottom: "16px" }}>
              // OUTPUT
            </div>
            <RarityBadge rarity={rarity} />
            <pre
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: "13px",
                color: COLOR.text,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {buildCopyText()}
            </pre>
            <WeakSpots
              weakSpots={weakSpots}
              loading={weakSpotsLoading}
              onFetch={handleFetchWeakSpots}
              onFix={handleFixWeakSpot}
              fixedIds={fixedWeakSpotIds}
              apiKeyAvailable={!!apiKey}
            />
          </div>
        )}
      </div>

      {draftOpen && (
        <DraftModePanel
          layers={LAYERS}
          selections={selections}
          fieldIndex={fieldIndex}
          onCommit={handleDraftCommit}
          onClose={() => setDraftOpen(false)}
        />
      )}
    </div>
  );
}

function themeQuestion(s) {
  const t = s.primaryTheme;
  const map = {
    "Power vs Humanity": "Can you grow strong enough to matter without losing what made you worth saving?",
    "Control vs Freedom": "Is the order the system provides worth the autonomy it costs?",
    "Survival vs Morality": "Does surviving without your values still count as living?",
    "Progress vs Identity": "Does becoming more mean leaving behind who you were?",
    "Knowledge vs Consequence": "Is knowing the truth worth the agency it destroys?",
    "Individual vs Collective": "Does your growth serve only you, and if so — is that enough?",
    "Truth vs Comfort": "Is understanding the system's real purpose worth shattering everything you believed?",
  };
  return map[t] || "—";
}
