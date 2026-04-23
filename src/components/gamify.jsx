// src/components/gamify.jsx
//
// Gamification UI — all the fun buttons, bars, toasts, and panels. Kept in
// one file so App.jsx stays readable and we only import a cohesive set of
// named exports.
//
// Exports:
//   <CoherenceMeter />       — animated bar + tier label
//   <ComboToasts />          — stacked auto-dismissing toast column
//   <RarityBadge />          — badge for generated output
//   <WeakSpots />            — post-generation 3 weak-spot list
//   <XpBar />                — XP + level bar, header-mounted
//   <RollDiceButton />       — "🎲 ROLL THE DICE" with budget + animation state
//   <DraftModePanel />       — deck-draft overlay
//   <CompanionBuilder />     — party recruitment panel
//   <ProgressionLadder />    — draggable book-1 / book-3 pins

import { useEffect, useMemo, useRef, useState } from "react";
import { labelForScore } from "../lib/coherence.js";
import { dealOptions, rollDice as rollDiceLogic } from "../lib/randomize.js";
import {
  COMPANION_ROSTER,
  suggestRoster,
  findCompanion,
} from "../lib/companions.js";
import { resolveRungs, normalizePins, LADDER_PRESETS } from "../lib/ladder.js";
import { levelFromXp } from "../lib/levelUp.js";

const TIER_COLORS = {
  Banger: "#a78bfa",
  "Query-Ready": "#8a5cf6",
  Workshop: "#d4a843",
  "Rough Draft": "#c45c5c",
};

const RARITY_COLORS = {
  Common: "#7c78a0",
  Uncommon: "#6ecf7b",
  Rare: "#5cb8f6",
  Legendary: "#e0a84b",
};

const FONT = "'Courier New', Courier, monospace";

// ===========================================================================
// CoherenceMeter
// ===========================================================================

export function CoherenceMeter({ coherence, lastDelta }) {
  const [flashKey, setFlashKey] = useState(0);
  const prevScore = useRef(coherence?.score ?? 0);

  useEffect(() => {
    if (!coherence) return;
    if (coherence.score !== prevScore.current) {
      setFlashKey((k) => k + 1);
      prevScore.current = coherence.score;
    }
  }, [coherence?.score]);

  if (!coherence) return null;
  const accent = TIER_COLORS[coherence.label] || "#a78bfa";
  const b = coherence.breakdown;
  const tooltip =
    `Score: ${coherence.score}/100\n` +
    `Completeness: ${b.completeness} (${b.filled}/${b.requiredTotal} req, subplots ${b.subplotOk ? "OK" : "out-of-range"})\n` +
    `Compatibility: ${b.compatibility} (${b.warnings} warning${b.warnings === 1 ? "" : "s"})\n` +
    `Cohesion bonus: +${b.cohesionBonus} (${b.highValueCombos} high-value combo${b.highValueCombos === 1 ? "" : "s"})`;

  return (
    <div
      title={tooltip}
      style={{
        marginTop: "18px",
        padding: "14px 16px 12px",
        border: `1px solid ${accent}`,
        background: "rgba(0,0,0,0.3)",
        borderRadius: "3px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <div style={{ fontSize: "10px", color: accent, letterSpacing: "3px" }}>
          // STORY INTEGRITY
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
        <div style={{ fontSize: "11px", color: "#6b6890", marginLeft: "auto", letterSpacing: "1px" }}>
          {coherence.score}/100
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height: "8px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "2px",
          overflow: "hidden",
          border: `1px solid rgba(255,255,255,0.05)`,
        }}
      >
        <div
          style={{
            width: `${coherence.score}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${accent}66, ${accent})`,
            transition: "width 0.45s cubic-bezier(.2,.8,.2,1)",
          }}
        />
        {/* Tier markers */}
        {[40, 65, 85].map((m) => (
          <div
            key={m}
            style={{
              position: "absolute",
              left: `${m}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              background: "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        {["Rough Draft", "Workshop", "Query-Ready", "Banger"].map((t) => {
          const active = t === coherence.label;
          return (
            <div
              key={t}
              style={{
                fontSize: "9px",
                letterSpacing: "2px",
                color: active ? TIER_COLORS[t] : "#5a567a",
                fontWeight: active ? 700 : 400,
                textTransform: "uppercase",
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
      {lastDelta != null && lastDelta !== 0 && (
        <div
          key={flashKey}
          aria-hidden
          style={{
            position: "absolute",
            top: "10px",
            right: "16px",
            color: lastDelta > 0 ? "#6ecf7b" : "#f87171",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "1px",
            animation: "plotgen-rise 0.9s ease-out forwards",
            pointerEvents: "none",
          }}
        >
          {lastDelta > 0 ? `+${lastDelta}` : lastDelta}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// ComboToasts
// ===========================================================================

export function ComboToasts({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "360px",
        fontFamily: FONT,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.key}
          onClick={() => onDismiss(t.key)}
          style={{
            padding: "12px 14px",
            border: "1px solid #a78bfa",
            background: "rgba(15, 10, 30, 0.95)",
            color: "#e2e0f0",
            borderRadius: "3px",
            fontSize: "12px",
            letterSpacing: "0.5px",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(138,92,246,0.35)",
            animation: "plotgen-slide 0.3s ease-out",
          }}
          title="Click to dismiss"
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// RarityBadge
// ===========================================================================

export function RarityBadge({ rarity }) {
  if (!rarity) return null;
  const color = RARITY_COLORS[rarity.tier] || "#a78bfa";
  return (
    <div
      title={`Rarity score: ${rarity.score}\nTag overlaps: ${rarity.overlaps}\nCombos: ${rarity.combos}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        border: `1px solid ${color}`,
        borderRadius: "3px",
        background: "rgba(0,0,0,0.35)",
        marginBottom: "14px",
      }}
    >
      <span style={{ fontSize: "10px", color, letterSpacing: "3px" }}>◆ RARITY</span>
      <span style={{ fontSize: "13px", color, letterSpacing: "2px", fontWeight: 700, textTransform: "uppercase" }}>
        {rarity.tier}
      </span>
      <span style={{ fontSize: "11px", color: "#7c78a0" }}>{rarity.blurb}</span>
    </div>
  );
}

// ===========================================================================
// WeakSpots
// ===========================================================================

export function WeakSpots({ weakSpots, loading, onFetch, onFix, fixedIds = [], apiKeyAvailable }) {
  if (!weakSpots && !loading && !onFetch) return null;
  return (
    <div
      style={{
        marginTop: "20px",
        border: "1px solid rgba(138,92,246,0.25)",
        background: "rgba(138,92,246,0.06)",
        borderRadius: "3px",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: "10px", color: "#a78bfa", letterSpacing: "3px", marginBottom: "10px" }}>
        // LEVEL UP YOUR SEED
      </div>
      {!weakSpots && (
        <button
          type="button"
          onClick={onFetch}
          disabled={loading || !apiKeyAvailable}
          style={{
            padding: "10px 14px",
            background: "rgba(138,92,246,0.15)",
            border: "1px solid rgba(138,92,246,0.6)",
            color: "#c4b5fd",
            fontFamily: FONT,
            fontSize: "11px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            cursor: loading || !apiKeyAvailable ? "not-allowed" : "pointer",
            borderRadius: "2px",
          }}
          title={!apiKeyAvailable ? "API key required" : "Ask the model for 3 weak spots"}
        >
          {loading ? "◌ ANALYZING…" : "◆ FIND 3 WEAK SPOTS"}
        </button>
      )}
      {weakSpots?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {weakSpots.map((w, i) => {
            const id = `${i}-${w.field}`;
            const fixed = fixedIds.includes(id);
            return (
              <div
                key={id}
                style={{
                  padding: "10px 12px",
                  border: `1px solid ${fixed ? "#6ecf7b" : "rgba(138,92,246,0.35)"}`,
                  background: fixed ? "rgba(110,207,123,0.08)" : "rgba(0,0,0,0.25)",
                  borderRadius: "2px",
                }}
              >
                <div style={{ fontSize: "12px", color: fixed ? "#6ecf7b" : "#c4b5fd", fontWeight: 700, marginBottom: "4px" }}>
                  {fixed ? "✓ FIXED" : "◇"} {w.title}
                </div>
                {w.field && (
                  <div style={{ fontSize: "10px", color: "#7c78a0", letterSpacing: "1px", marginBottom: "4px" }}>
                    field: <code style={{ color: "#a78bfa" }}>{w.field}</code>
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#e2e0f0", lineHeight: 1.6, marginBottom: "6px" }}>
                  {w.fix}
                </div>
                {!fixed && (
                  <button
                    type="button"
                    onClick={() => onFix(id, w)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "10px",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      border: "1px solid rgba(138,92,246,0.6)",
                      background: "rgba(138,92,246,0.15)",
                      color: "#c4b5fd",
                      cursor: "pointer",
                      borderRadius: "2px",
                      fontFamily: FONT,
                    }}
                  >
                    ✓ MARK FIXED (+25 XP)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {weakSpots?.length === 0 && (
        <div style={{ fontSize: "12px", color: "#7c78a0" }}>
          No weak spots returned — either your seed is tight, or the model declined. Try again.
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// XpBar
// ===========================================================================

export function XpBar({ xp }) {
  const info = levelFromXp(xp ?? 0);
  const pct = Math.max(0, Math.min(1, info.progress));
  return (
    <div
      title={`Level ${info.level} · ${info.xp} XP\nNext level at ${info.ceiling} XP`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "4px 10px",
        border: "1px solid rgba(138,92,246,0.35)",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "2px",
        fontSize: "10px",
        color: "#a78bfa",
        letterSpacing: "2px",
      }}
    >
      <span>LVL {info.level}</span>
      <div style={{ width: "80px", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: "#8a5cf6", transition: "width 0.4s" }} />
      </div>
      <span style={{ color: "#7c78a0" }}>{info.xp} XP</span>
    </div>
  );
}

// ===========================================================================
// RollDiceButton
// ===========================================================================

export function RollDiceButton({ budget, rolling, onRoll, disabled }) {
  const out = budget <= 0;
  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={disabled || rolling || out}
      title={
        out
          ? "Out of re-rolls this session (reopen the app to reset)"
          : `Fills empty fields with a thematically-weighted random pick. ${budget} re-roll${budget === 1 ? "" : "s"} left.`
      }
      style={{
        padding: "12px 16px",
        background: out ? "rgba(138,92,246,0.05)" : "rgba(138,92,246,0.15)",
        border: `1px solid ${out ? "rgba(138,92,246,0.25)" : "rgba(138,92,246,0.6)"}`,
        color: out ? "#6b6890" : "#c4b5fd",
        fontFamily: FONT,
        fontSize: "12px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        cursor: disabled || rolling || out ? "not-allowed" : "pointer",
        borderRadius: "2px",
        minWidth: "240px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span style={{ display: "inline-block", animation: rolling ? "plotgen-spin 0.6s linear infinite" : "none", marginRight: "6px" }}>
        🎲
      </span>
      {rolling ? "ROLLING…" : `ROLL THE DICE (${budget})`}
    </button>
  );
}

// ===========================================================================
// DraftModePanel
// ===========================================================================

/**
 * Draft mode: user picks an archetype, then we walk remaining single-select
 * fields dealing 3 options per field for them to choose from.
 */
export function DraftModePanel({ layers, selections, fieldIndex, onCommit, onClose }) {
  const singleFieldIds = useMemo(() => {
    const out = [];
    for (const layer of layers || []) {
      for (const group of layer.groups || []) {
        for (const comp of group.components || []) {
          if (comp.multi || comp.freeform) continue;
          if (!Array.isArray(comp.options) || !comp.options.length) continue;
          out.push(comp.id);
        }
      }
    }
    return out;
  }, [layers]);

  const [stepIndex, setStepIndex] = useState(0);
  const [draftSelections, setDraftSelections] = useState({ ...selections });
  const [hand, setHand] = useState([]);
  const currentFieldId = singleFieldIds[stepIndex];
  const currentComp = currentFieldId ? fieldIndex[currentFieldId] : null;

  useEffect(() => {
    if (!currentFieldId) return;
    const dealt = dealOptions(layers, draftSelections, currentFieldId, 3);
    setHand(dealt);
  }, [stepIndex, currentFieldId]);  // eslint-disable-line react-hooks/exhaustive-deps

  function choose(opt) {
    const next = { ...draftSelections, [currentFieldId]: opt.value };
    setDraftSelections(next);
    if (stepIndex + 1 >= singleFieldIds.length) {
      onCommit(next);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }
  function skip() {
    if (stepIndex + 1 >= singleFieldIds.length) {
      onCommit(draftSelections);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }
  function reshuffle() {
    if (!currentFieldId) return;
    setHand(dealOptions(layers, draftSelections, currentFieldId, 3));
  }

  if (!currentComp) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,15,0.88)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          width: "100%",
          border: "1px solid rgba(138,92,246,0.6)",
          background: "rgba(15,10,30,0.98)",
          borderRadius: "4px",
          padding: "24px",
          boxShadow: "0 24px 80px rgba(138,92,246,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: "#a78bfa", letterSpacing: "3px" }}>
            // DRAFT MODE · {stepIndex + 1} / {singleFieldIds.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "1px solid rgba(138,92,246,0.35)",
              color: "#7c78a0",
              padding: "4px 10px",
              fontSize: "10px",
              letterSpacing: "2px",
              fontFamily: FONT,
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            ✗ EXIT
          </button>
        </div>
        <div style={{ fontSize: "16px", color: "#e2e0f0", marginBottom: "4px" }}>
          {currentComp.label}
        </div>
        <div style={{ fontSize: "11px", color: "#7c78a0", marginBottom: "16px" }}>
          Pick one. Skip to leave empty. Reshuffle to re-deal.
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          {hand.length === 0 && (
            <div style={{ fontSize: "12px", color: "#7c78a0" }}>
              No non-conflicting options left for this field. Skip ahead.
            </div>
          )}
          {hand.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                border: "1px solid rgba(138,92,246,0.35)",
                background: "rgba(0,0,0,0.35)",
                color: "#e2e0f0",
                fontFamily: FONT,
                fontSize: "13px",
                cursor: "pointer",
                borderRadius: "2px",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(138,92,246,0.15)";
                e.currentTarget.style.borderColor = "rgba(138,92,246,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.35)";
                e.currentTarget.style.borderColor = "rgba(138,92,246,0.35)";
              }}
            >
              <div style={{ fontWeight: 700, color: "#c4b5fd", marginBottom: "4px" }}>
                ▸ {opt.value}
              </div>
              {opt.description && (
                <div style={{ fontSize: "11px", color: "#a78bfa", opacity: 0.9 }}>
                  {opt.description}
                </div>
              )}
              {opt.tags?.length > 0 && (
                <div style={{ fontSize: "10px", color: "#7c78a0", marginTop: "4px", letterSpacing: "1px" }}>
                  {opt.tags.map((t) => `#${t}`).join("  ")}
                </div>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            type="button"
            onClick={reshuffle}
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(138,92,246,0.35)",
              color: "#c4b5fd",
              fontFamily: FONT,
              fontSize: "11px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            ↻ RESHUFFLE HAND
          </button>
          <button
            type="button"
            onClick={skip}
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(138,92,246,0.35)",
              color: "#7c78a0",
              fontFamily: FONT,
              fontSize: "11px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            → SKIP
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// CompanionBuilder
// ===========================================================================

export function CompanionBuilder({ selections, setCompanions }) {
  const active = selections.companions || [];
  const activeTags = useMemo(() => {
    const tags = new Set();
    for (const id of active) {
      const c = findCompanion(id);
      if (c?.tags) for (const t of c.tags) tags.add(t);
    }
    return tags;
  }, [active]);
  const roster = useMemo(
    () =>
      suggestRoster({
        activeTags,
        subplots: selections.subplots || [],
        limit: 10,
      }),
    [activeTags, selections.subplots]
  );

  const MAX = 4;
  function toggle(id) {
    const on = active.includes(id);
    if (on) {
      setCompanions(active.filter((x) => x !== id));
    } else {
      if (active.length >= MAX) return;
      setCompanions([...active, id]);
    }
  }

  return (
    <div
      style={{
        marginTop: "16px",
        border: "1px solid rgba(138,92,246,0.25)",
        background: "rgba(138,92,246,0.04)",
        borderRadius: "3px",
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: "10px", color: "#a78bfa", letterSpacing: "3px", marginBottom: "8px" }}>
        // 4.4 PARTY · recruit up to {MAX} ({active.length}/{MAX})
      </div>
      <div style={{ fontSize: "11px", color: "#7c78a0", marginBottom: "12px", lineHeight: 1.6 }}>
        Tagged-party draft: companions ordered by resonance with your subplots + active tags.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
        {roster.map((c) => {
          const on = active.includes(c.id);
          const disabled = !on && active.length >= MAX;
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(c.id)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                border: `1px solid ${on ? "#a78bfa" : "rgba(138,92,246,0.25)"}`,
                background: on ? "rgba(138,92,246,0.15)" : "rgba(0,0,0,0.25)",
                color: on ? "#c4b5fd" : "#e2e0f0",
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: FONT,
                borderRadius: "2px",
                opacity: disabled ? 0.35 : 1,
                transition: "all 0.15s",
              }}
              title={c.blurb}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "2px" }}>
                {on ? "▣" : disabled ? "⊘" : "▢"} {c.name}
              </div>
              <div style={{ fontSize: "10px", color: "#7c78a0", letterSpacing: "1px", marginBottom: "4px" }}>
                {c.role}{c.score > 0 ? ` · resonance ${c.score}` : ""}
              </div>
              <div style={{ fontSize: "11px", color: on ? "#a78bfa" : "#7c78a0", lineHeight: 1.4 }}>
                {c.blurb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// ProgressionLadder — draggable book pins
// ===========================================================================

export function ProgressionLadder({ selections, setPins }) {
  const rungs = resolveRungs(selections);
  const [dragging, setDragging] = useState(null); // "book1" | "book3" | null
  const trackRef = useRef(null);

  if (!rungs.length) {
    return (
      <div
        style={{
          marginTop: "14px",
          padding: "12px",
          border: "1px dashed rgba(138,92,246,0.25)",
          borderRadius: "3px",
          fontSize: "11px",
          color: "#7c78a0",
          fontFamily: FONT,
        }}
      >
        // LADDER — pick a rung preset (or type custom rungs) to unlock the book-pin track.
      </div>
    );
  }

  const pins = normalizePins(selections.progressionPins, rungs.length);
  const commit = (next) =>
    setPins(normalizePins(next, rungs.length));

  function indexFromClientX(clientX) {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * (rungs.length - 1));
  }

  function onPointerDown(which, e) {
    setDragging(which);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const idx = indexFromClientX(e.clientX);
    if (dragging === "book1") commit({ ...pins, book1Index: Math.min(idx, pins.book3Index) });
    else commit({ ...pins, book3Index: Math.max(idx, pins.book1Index) });
  }
  function onPointerUp() {
    setDragging(null);
  }

  const pct = (i) => (rungs.length === 1 ? 0 : (i / (rungs.length - 1)) * 100);

  return (
    <div
      style={{
        marginTop: "14px",
        padding: "14px 16px 20px",
        border: "1px solid rgba(138,92,246,0.35)",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "3px",
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: "10px", color: "#a78bfa", letterSpacing: "3px", marginBottom: "14px" }}>
        // LADDER — drag pins to set where books 1 &amp; 3 end
      </div>
      <div
        ref={trackRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          position: "relative",
          height: "48px",
          margin: "28px 14px 32px",
          touchAction: "none",
        }}
      >
        {/* Track line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "4px",
            transform: "translateY(-50%)",
            background: "linear-gradient(90deg, rgba(138,92,246,0.15), rgba(138,92,246,0.6), rgba(138,92,246,0.15))",
            borderRadius: "2px",
          }}
        />
        {/* Rung ticks + labels */}
        {rungs.map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${pct(i)}%`,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "2px",
                height: "16px",
                background: "rgba(138,92,246,0.5)",
                marginTop: "15px",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "38px",
                fontSize: "9px",
                color: "#7c78a0",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                transform: "translateX(-50%) rotate(-20deg)",
                transformOrigin: "top left",
              }}
            >
              {r}
            </div>
          </div>
        ))}
        {/* Pin 1 */}
        <Pin
          which="book1"
          color="#8a5cf6"
          label="BK1"
          leftPct={pct(pins.book1Index)}
          onPointerDown={(e) => onPointerDown("book1", e)}
          dragging={dragging === "book1"}
        />
        {/* Pin 3 */}
        <Pin
          which="book3"
          color="#e0a84b"
          label="BK3"
          leftPct={pct(pins.book3Index)}
          onPointerDown={(e) => onPointerDown("book3", e)}
          dragging={dragging === "book3"}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#7c78a0", marginTop: "36px" }}>
        <span>
          <span style={{ color: "#8a5cf6" }}>■ Book 1</span> ends at <strong style={{ color: "#c4b5fd" }}>{rungs[pins.book1Index]}</strong>
        </span>
        <span>
          <span style={{ color: "#e0a84b" }}>■ Book 3</span> ends at <strong style={{ color: "#e0a84b" }}>{rungs[pins.book3Index]}</strong>
        </span>
      </div>
    </div>
  );
}

function Pin({ which, color, label, leftPct, onPointerDown, dragging }) {
  return (
    <div
      role="slider"
      aria-label={which}
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        top: "50%",
        left: `${leftPct}%`,
        transform: `translate(-50%, -50%) ${dragging ? "scale(1.15)" : "scale(1)"}`,
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        border: `2px solid ${color}`,
        background: "#0a0a0f",
        color,
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "1px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: dragging ? "grabbing" : "grab",
        boxShadow: `0 0 ${dragging ? 18 : 10}px ${color}`,
        transition: "transform 0.12s, box-shadow 0.12s",
        userSelect: "none",
        zIndex: 2,
      }}
    >
      {label}
    </div>
  );
}

// ===========================================================================
// Keyframe styles — injected once on mount.
// ===========================================================================

export function GamifyStyles() {
  return (
    <style>{`
@keyframes plotgen-rise {
  0%   { transform: translateY(0); opacity: 0; }
  15%  { opacity: 1; }
  100% { transform: translateY(-24px); opacity: 0; }
}
@keyframes plotgen-slide {
  0%   { transform: translateX(40px); opacity: 0; }
  100% { transform: translateX(0);    opacity: 1; }
}
@keyframes plotgen-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
    `}</style>
  );
}

// Re-export the raw roll logic so App.jsx can call it without another import.
export { rollDiceLogic };
export { COMPANION_ROSTER, LADDER_PRESETS, labelForScore };
