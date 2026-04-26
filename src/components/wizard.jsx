// src/components/wizard.jsx
//
// Wizard / step-by-step view of the form.
//
// This component is *presentation only*: it owns step navigation, the
// progress strip, the missing-fields preflight, the recovery banner, and the
// mode toggle. It does not own selections — those stay in App.jsx so the
// power-mode view shares the same source of truth.
//
// Step body rendering is delegated to a `renderStep(step)` callback so the
// host can re-use its existing <Layer> JSX without any of it leaking here.

import { useEffect, useMemo, useState } from "react";
import {
  isStepComplete,
  requiredFieldsRemaining,
  overallProgress,
} from "../lib/wizard.js";

const W_COLOR = {
  bg: "#0a0a0f",
  panel: "rgba(255,255,255,0.03)",
  text: "#e2e0f0",
  muted: "#7c78a0",
  dim: "#6b6890",
  purple: "#8a5cf6",
  purpleSoft: "#a78bfa",
  purpleLight: "#c4b5fd",
  border: "rgba(138,92,246,0.25)",
  borderStrong: "rgba(138,92,246,0.6)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
  amber: "#fbbf24",
  amberBg: "rgba(251,191,36,0.08)",
  green: "#4ade80",
  greenBg: "rgba(74,222,128,0.08)",
};
const W_FONT = "'Courier New', Courier, monospace";

/**
 * Segmented control: WIZARD ↔ POWER. Stateless.
 */
export function ModeToggle({ mode, onChange }) {
  return (
    <div style={modeStyles.wrap} role="radiogroup" aria-label="View mode">
      {[
        { id: "wizard", label: "WIZARD" },
        { id: "power", label: "POWER" },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
          style={{
            ...modeStyles.btn,
            ...(mode === m.id ? modeStyles.btnActive : null),
          }}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Persistent banner shown when an in-flight draft is detected on mount.
 */
export function DraftRecoveryBanner({ savedAt, onResume, onDiscard }) {
  return (
    <div style={recoveryStyles.wrap} role="status">
      <div>
        <strong style={{ color: W_COLOR.purpleLight }}>↻ Unsaved draft found</strong>
        <span style={{ color: W_COLOR.muted, marginLeft: 8 }}>
          {savedAt ? `last edit ${formatRelative(savedAt)}` : ""}
        </span>
      </div>
      <div style={recoveryStyles.btnRow}>
        <button type="button" style={recoveryStyles.primary} onClick={onResume}>
          ▸ RESUME
        </button>
        <button type="button" style={recoveryStyles.secondary} onClick={onDiscard}>
          ✕ DISCARD
        </button>
      </div>
    </div>
  );
}

/**
 * Top-of-form progress strip: dots for every step + a percentage.
 */
export function WizardProgress({ steps, stepIndex, selections, onJumpTo }) {
  const pct = Math.round(overallProgress(steps, selections) * 100);
  return (
    <div style={progressStyles.wrap}>
      <div style={progressStyles.headRow}>
        <span style={progressStyles.eyebrow}>// PROGRESS</span>
        <span style={progressStyles.pct}>{pct}% complete</span>
      </div>
      <div style={progressStyles.bar}>
        <div
          style={{
            ...progressStyles.barFill,
            width: `${pct}%`,
          }}
        />
      </div>
      <div style={progressStyles.dotRow}>
        {steps.map((s, i) => {
          const complete = isStepComplete(s, selections);
          const isActive = i === stepIndex;
          const dotStyle = {
            ...progressStyles.dot,
            ...(complete ? progressStyles.dotComplete : null),
            ...(isActive ? progressStyles.dotActive : null),
          };
          return (
            <button
              key={s.id}
              type="button"
              title={`${i + 1}. ${s.label}${complete ? " ✓" : ""}`}
              style={dotStyle}
              onClick={() => onJumpTo(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main wizard shell.
 *
 * @param {Object} props
 * @param {Array}  props.steps             from buildSteps(LAYERS)
 * @param {number} props.stepIndex
 * @param {Function} props.onStepChange    (newIndex) => void
 * @param {Object}  props.selections
 * @param {Function} props.renderStep      (step) => JSX
 * @param {boolean} [props.canGenerate]    if step is review, surface generate
 * @param {Function} [props.onGenerate]    button handler for review step
 * @param {boolean} [props.generateDisabled]
 * @param {string}  [props.generateLabel]
 */
export function WizardShell({
  steps,
  stepIndex,
  onStepChange,
  selections,
  renderStep,
  canGenerate,
  onGenerate,
  generateDisabled,
  generateLabel = "▶ GENERATE SEED",
}) {
  const safeIndex = clamp(stepIndex, 0, steps.length - 1);
  const step = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;
  const isFirst = safeIndex === 0;
  const remaining = useMemo(
    () => requiredFieldsRemaining(step, selections),
    [step, selections],
  );
  const complete = remaining.length === 0;
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Keyboard nav: Alt+Left / Alt+Right
  useEffect(() => {
    function onKey(e) {
      if (!e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        attemptNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!isFirst) onStepChange(safeIndex - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, isFirst, complete]);

  function attemptNext() {
    if (isLast) return;
    if (!complete) {
      setShowSkipConfirm(true);
      return;
    }
    onStepChange(safeIndex + 1);
  }

  function confirmSkip() {
    setShowSkipConfirm(false);
    if (!isLast) onStepChange(safeIndex + 1);
  }

  return (
    <div style={shellStyles.wrap}>
      <WizardProgress
        steps={steps}
        stepIndex={safeIndex}
        selections={selections}
        onJumpTo={(i) => onStepChange(i)}
      />

      <div style={shellStyles.stepHeader}>
        <div style={shellStyles.stepEyebrow}>
          STEP {safeIndex + 1} / {steps.length}
        </div>
        <h2 style={shellStyles.stepTitle}>{step.label}</h2>
        {step.subtitle && <div style={shellStyles.stepSub}>{step.subtitle}</div>}
        {!step.optional && (
          <div
            style={{
              ...shellStyles.stepStatus,
              color: complete ? W_COLOR.green : W_COLOR.amber,
            }}
          >
            {complete
              ? "✓ ready"
              : `${remaining.length} required field${remaining.length === 1 ? "" : "s"} remaining`}
          </div>
        )}
      </div>

      <div style={shellStyles.stepBody}>{renderStep(step)}</div>

      <div style={shellStyles.footer}>
        <button
          type="button"
          style={shellStyles.btnSecondary}
          onClick={() => !isFirst && onStepChange(safeIndex - 1)}
          disabled={isFirst}
        >
          ← BACK
        </button>
        <span style={shellStyles.spacer} />
        <select
          style={shellStyles.jumpSelect}
          value={safeIndex}
          onChange={(e) => onStepChange(Number(e.target.value))}
          aria-label="Jump to step"
        >
          {steps.map((s, i) => (
            <option key={s.id} value={i}>
              {i + 1}. {s.label}
              {isStepComplete(s, selections) ? " ✓" : ""}
            </option>
          ))}
        </select>
        {!isLast ? (
          <button
            type="button"
            style={{
              ...shellStyles.btnPrimary,
              opacity: 1,
            }}
            onClick={attemptNext}
          >
            NEXT →
          </button>
        ) : (
          canGenerate && (
            <button
              type="button"
              style={{
                ...shellStyles.btnPrimary,
                opacity: generateDisabled ? 0.5 : 1,
                cursor: generateDisabled ? "not-allowed" : "pointer",
              }}
              onClick={onGenerate}
              disabled={generateDisabled}
            >
              {generateLabel}
            </button>
          )
        )}
      </div>

      {showSkipConfirm && (
        <SkipConfirmDialog
          step={step}
          remaining={remaining}
          onCancel={() => setShowSkipConfirm(false)}
          onConfirm={confirmSkip}
        />
      )}
    </div>
  );
}

function SkipConfirmDialog({ step, remaining, onCancel, onConfirm }) {
  return (
    <div style={dialogStyles.backdrop} onClick={onCancel}>
      <div
        style={dialogStyles.box}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={dialogStyles.eyebrow}>// SKIP STEP — {step.label}</div>
        <p style={dialogStyles.body}>
          {remaining.length} required field{remaining.length === 1 ? "" : "s"} still empty:
        </p>
        <ul style={dialogStyles.list}>
          {remaining.map((id) => (
            <li key={id} style={dialogStyles.listItem}>
              <code>{id}</code>
            </li>
          ))}
        </ul>
        <p style={dialogStyles.body}>
          You can return to this step at any time. Continue?
        </p>
        <div style={dialogStyles.btnRow}>
          <button type="button" style={dialogStyles.cancel} onClick={onCancel}>
            ✕ STAY HERE
          </button>
          <button type="button" style={dialogStyles.primary} onClick={onConfirm}>
            ▸ CONTINUE ANYWAY
          </button>
        </div>
      </div>
    </div>
  );
}

// ── helpers
function clamp(n, lo, hi) {
  if (typeof n !== "number" || Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function formatRelative(ts) {
  if (!ts || typeof ts !== "number") return "";
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

// ── styles
const modeStyles = {
  wrap: {
    display: "inline-flex",
    border: `1px solid ${W_COLOR.border}`,
    borderRadius: 2,
    overflow: "hidden",
  },
  btn: {
    background: "transparent",
    color: W_COLOR.muted,
    border: "none",
    padding: "6px 12px",
    fontFamily: W_FONT,
    fontSize: 10,
    letterSpacing: 2,
    cursor: "pointer",
  },
  btnActive: {
    background: W_COLOR.purple,
    color: "#fff",
  },
};

const recoveryStyles = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "12px 0",
    padding: "10px 14px",
    border: `1px solid ${W_COLOR.borderStrong}`,
    background: "rgba(138,92,246,0.08)",
    fontFamily: W_FONT,
    fontSize: 11,
    color: W_COLOR.text,
  },
  btnRow: { display: "flex", gap: 6 },
  primary: {
    background: W_COLOR.purple,
    color: "#fff",
    border: `1px solid ${W_COLOR.borderStrong}`,
    padding: "5px 10px",
    fontFamily: W_FONT,
    fontSize: 10,
    letterSpacing: 2,
    cursor: "pointer",
  },
  secondary: {
    background: "transparent",
    color: W_COLOR.muted,
    border: `1px solid ${W_COLOR.border}`,
    padding: "5px 10px",
    fontFamily: W_FONT,
    fontSize: 10,
    letterSpacing: 2,
    cursor: "pointer",
  },
};

const progressStyles = {
  wrap: { margin: "12px 0 16px" },
  headRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: W_COLOR.purple,
  },
  pct: {
    fontSize: 10,
    letterSpacing: 2,
    color: W_COLOR.purpleLight,
  },
  bar: {
    height: 4,
    background: "rgba(138,92,246,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: W_COLOR.purple,
    transition: "width 200ms ease",
  },
  dotRow: {
    display: "flex",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    border: `1px solid ${W_COLOR.border}`,
    background: "transparent",
    color: W_COLOR.muted,
    fontFamily: W_FONT,
    fontSize: 10,
    cursor: "pointer",
    padding: 0,
  },
  dotComplete: {
    borderColor: W_COLOR.green,
    color: W_COLOR.green,
  },
  dotActive: {
    background: W_COLOR.purple,
    color: "#fff",
    borderColor: W_COLOR.purple,
  },
};

const shellStyles = {
  wrap: {},
  stepHeader: {
    margin: "16px 0 12px",
    paddingBottom: 8,
    borderBottom: `1px solid ${W_COLOR.border}`,
  },
  stepEyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: W_COLOR.purple,
  },
  stepTitle: {
    margin: "4px 0 2px",
    fontSize: 22,
    color: W_COLOR.text,
    fontFamily: W_FONT,
    letterSpacing: 1,
  },
  stepSub: {
    fontSize: 12,
    color: W_COLOR.muted,
    fontFamily: W_FONT,
    lineHeight: 1.6,
  },
  stepStatus: {
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 6,
    fontFamily: W_FONT,
  },
  stepBody: { marginBottom: 16 },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: "12px 0",
    borderTop: `1px solid ${W_COLOR.border}`,
  },
  spacer: { flex: 1 },
  jumpSelect: {
    background: W_COLOR.panel,
    color: W_COLOR.text,
    border: `1px solid ${W_COLOR.border}`,
    padding: "6px 8px",
    fontFamily: W_FONT,
    fontSize: 11,
  },
  btnPrimary: {
    background: W_COLOR.purple,
    color: "#fff",
    border: `1px solid ${W_COLOR.borderStrong}`,
    padding: "8px 14px",
    fontFamily: W_FONT,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 2,
  },
  btnSecondary: {
    background: "transparent",
    color: W_COLOR.muted,
    border: `1px solid ${W_COLOR.border}`,
    padding: "8px 14px",
    fontFamily: W_FONT,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
  },
};

const dialogStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,10,15,0.75)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  box: {
    maxWidth: 500,
    width: "100%",
    background: W_COLOR.bg,
    border: `1px solid ${W_COLOR.borderStrong}`,
    padding: 18,
    fontFamily: W_FONT,
    color: W_COLOR.text,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: W_COLOR.amber,
    marginBottom: 8,
  },
  body: {
    fontSize: 12,
    color: W_COLOR.text,
    lineHeight: 1.6,
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "8px 0",
    maxHeight: 160,
    overflow: "auto",
  },
  listItem: {
    fontSize: 11,
    color: W_COLOR.muted,
    padding: "3px 0",
  },
  btnRow: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 12,
  },
  primary: {
    background: W_COLOR.amber,
    color: "#0a0a0f",
    border: `1px solid ${W_COLOR.amber}`,
    padding: "8px 14px",
    fontFamily: W_FONT,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
  },
  cancel: {
    background: "transparent",
    color: W_COLOR.muted,
    border: `1px solid ${W_COLOR.border}`,
    padding: "8px 14px",
    fontFamily: W_FONT,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
  },
};
