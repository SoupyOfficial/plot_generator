// src/components/pipelineCockpit.jsx
//
// Solo Author Cockpit — the right-rail dock that walks a contract through the
// full state-machine pipeline (selections → contract → series → outline →
// arcs → beats → scenes → bible → scaffold → prose → audit → ingest → done)
// and exposes a "Reverse from prose" workflow for back-fitting selections
// from existing chapter text.
//
// Self-contained: receives `selections`, `userNotes`, `apiKey`, and a
// `callRawLLM(apiKey, {system, user}, opts)` function from the parent. The
// parent owns the form; the cockpit owns the pipeline state.
//
// Pure presentation + thin orchestration. All business logic lives in the
// state machine (src/lib/pipeline.js) and the prompt builders.

import { useMemo, useState } from "react";
import {
  PHASES,
  createPipelineState,
  advance,
  runDeterministicPhases,
} from "../lib/pipeline.js";
import { parseChapterScaffold } from "../lib/chapterPlan.js";
import {
  buildReverseEngineerPrompt,
  parseReverseEngineerResponse,
} from "../lib/reverseEngineer.js";

const COCKPIT_COLOR = {
  bg: "rgba(10, 10, 15, 0.85)",
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
  cyan: "#38bdf8",
};
const COCKPIT_FONT = "'Courier New', Courier, monospace";

const TABS = [
  { id: "pipeline", label: "PIPELINE" },
  { id: "audit", label: "AUDIT" },
  { id: "reverse", label: "REVERSE" },
];

/**
 * @param {Object} props
 * @param {Object}   props.selections          current form selections
 * @param {string}   props.userNotes
 * @param {string}   props.apiKey
 * @param {Function} props.callRawLLM          (apiKey, {system,user}, opts) => Promise<string>
 * @param {Array}    props.layers              LAYERS data
 * @param {Function} [props.onApplyReverse]    (mappedSelections) => void
 */
export function PipelineCockpit({
  selections,
  userNotes,
  apiKey,
  callRawLLM,
  layers,
  onApplyReverse,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("pipeline");
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [statusLine, setStatusLine] = useState("");

  // Reverse-mode state
  const [reverseProse, setReverseProse] = useState("");
  const [reverseDiff, setReverseDiff] = useState(null); // { mapped, conflicts, accepted:Set }
  const [reverseRaw, setReverseRaw] = useState("");

  function reset() {
    setState(null);
    setErr("");
    setStatusLine("");
  }

  function init() {
    const s = createPipelineState({ selections, userNotes });
    setState(s);
    setStatusLine("Initialized at phase=selections.");
    setErr("");
  }

  function runDeterministic() {
    try {
      const s = state || createPipelineState({ selections, userNotes });
      const next = runDeterministicPhases(s);
      setState(next);
      setStatusLine(`Advanced to phase=${next.phase}.`);
      setErr("");
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  async function step(input = {}, transformPrompt) {
    if (!state) return;
    try {
      setBusy(true);
      setErr("");
      let next = advance(state, input);
      // If next phase has a pendingPrompt, fire the LLM and feed result back in.
      if (next.pendingPrompt && transformPrompt) {
        const { kind, system, user } = next.pendingPrompt;
        const wantsJson = kind === "scaffold";
        const text = await callRawLLM(
          apiKey,
          { system, user },
          { json: wantsJson, maxTokens: kind === "prose" ? 4000 : 2000 },
        );
        next = transformPrompt(next, text);
      }
      setState(next);
      setStatusLine(`Advanced to phase=${next.phase}.`);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function emitScaffoldThenAdvance() {
    if (!state) return;
    if (!apiKey) {
      setErr("API key required for scaffold/prose phases.");
      return;
    }
    // We're at "bible" (or back to bible after a chapter). One step → scaffold,
    // which generates a pendingPrompt; we then fetch the LLM, parse, and feed
    // the parsed scaffold back in to advance to "prose".
    try {
      setBusy(true);
      setErr("");
      // Step 1: bible → scaffold (no LLM yet, just builds prompt)
      let next = advance(state, {});
      if (next.phase !== "scaffold" || !next.pendingPrompt) {
        throw new Error(`expected scaffold prompt, got phase=${next.phase}`);
      }
      // Step 2: send scaffold prompt
      const { system, user } = next.pendingPrompt;
      setStatusLine(`Requesting scaffold for chapter ${next.chapterIndex}…`);
      const scaffoldText = await callRawLLM(apiKey, { system, user }, { json: true, maxTokens: 2000 });
      const scaffold = parseChapterScaffold(scaffoldText);
      // Step 3: scaffold → prose (builds prose prompt)
      next = advance(next, { scaffold });
      if (next.phase !== "prose" || !next.pendingPrompt) {
        throw new Error(`expected prose prompt, got phase=${next.phase}`);
      }
      // Step 4: send prose prompt
      setStatusLine(`Requesting prose for chapter ${next.chapterIndex}…`);
      const prose = await callRawLLM(
        apiKey,
        { system: next.pendingPrompt.system, user: next.pendingPrompt.user },
        { json: false, maxTokens: 4000 },
      );
      // Step 5: prose → audit (auditChapter)
      next = advance(next, { prose });
      // Step 6: audit → ingest
      next = advance(next, {});
      // Step 7: ingest → next chapter or done
      next = advance(next, {});
      setState(next);
      setStatusLine(
        next.phase === "done"
          ? "All chapters complete."
          : `Chapter complete; ready for chapter ${next.chapterIndex}.`,
      );
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runReverse() {
    if (!apiKey) {
      setErr("API key required for reverse mode.");
      return;
    }
    if (!reverseProse.trim()) {
      setErr("Paste prose into the textarea first.");
      return;
    }
    try {
      setBusy(true);
      setErr("");
      const { system, user } = buildReverseEngineerPrompt({
        layers,
        prose: reverseProse,
        knownSelections: selections,
      });
      const text = await callRawLLM(apiKey, { system, user }, { json: true, maxTokens: 2000 });
      setReverseRaw(text);
      const parsed = parseReverseEngineerResponse(text, layers);
      const mapped = parsed.mapped || {};
      const conflicts = parsed.conflicts || [];
      const accepted = new Set(Object.keys(mapped));
      setReverseDiff({ mapped, conflicts, accepted });
      setStatusLine(`Reverse complete: ${Object.keys(mapped).length} fields, ${conflicts.length} conflicts.`);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleAccept(field) {
    setReverseDiff((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.accepted);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return { ...prev, accepted: next };
    });
  }

  function applyAccepted() {
    if (!reverseDiff || !onApplyReverse) return;
    const out = {};
    for (const k of reverseDiff.accepted) {
      if (reverseDiff.mapped[k] !== undefined) out[k] = reverseDiff.mapped[k];
    }
    onApplyReverse(out);
    setStatusLine(`Applied ${Object.keys(out).length} reverse-mapped fields.`);
  }

  // ── derived
  const phaseIndex = useMemo(() => {
    if (!state) return -1;
    return PHASES.indexOf(state.phase);
  }, [state]);

  const audit = state?.currentAudit;
  const findings = audit ? collectFindings(audit) : [];
  const ledger = state?.series?.foreshadowLedger || [];
  const ledgerOpen = ledger.filter((e) => !e.paidOff).length;
  const fp = state?.currentFingerprint;

  if (!open) {
    return (
      <button
        type="button"
        style={{
          ...cockpitStyles.fab,
          background: state ? COCKPIT_COLOR.purple : "rgba(138,92,246,0.85)",
        }}
        onClick={() => setOpen(true)}
        title="Open Pipeline Cockpit"
      >
        ◈ COCKPIT{state ? ` · ${state.phase.toUpperCase()}` : ""}
      </button>
    );
  }

  return (
    <div style={cockpitStyles.dock}>
      <div style={cockpitStyles.header}>
        <div style={cockpitStyles.eyebrow}>// SOLO AUTHOR COCKPIT</div>
        <button
          type="button"
          style={cockpitStyles.closeBtn}
          onClick={() => setOpen(false)}
          title="Hide cockpit"
        >
          ✕
        </button>
      </div>

      <div style={cockpitStyles.tabRow}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            style={{
              ...cockpitStyles.tab,
              ...(tab === t.id ? cockpitStyles.tabActive : null),
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pipeline" && (
        <div style={cockpitStyles.body}>
          <PhaseStrip phase={state?.phase} phaseIndex={phaseIndex} />
          <div style={cockpitStyles.btnRow}>
            {!state && (
              <button type="button" style={cockpitStyles.primaryBtn} onClick={init}>
                ▸ INIT FROM SELECTIONS
              </button>
            )}
            {state && (
              <>
                <button
                  type="button"
                  style={cockpitStyles.primaryBtn}
                  onClick={runDeterministic}
                  disabled={busy}
                  title="Run all data-only phases (selections → bible) without calling the LLM"
                >
                  ▸ RUN DETERMINISTIC
                </button>
                <button
                  type="button"
                  style={cockpitStyles.primaryBtn}
                  onClick={emitScaffoldThenAdvance}
                  disabled={busy || !apiKey || (state.phase !== "bible" && state.phase !== "ingest")}
                  title="Generate next chapter (scaffold → prose → audit → ingest) via LLM"
                >
                  {busy ? "◌ WORKING…" : "▸ NEXT CHAPTER"}
                </button>
                <button type="button" style={cockpitStyles.utilityBtn} onClick={reset} disabled={busy}>
                  ↻ RESET
                </button>
              </>
            )}
          </div>

          {state && (
            <div style={cockpitStyles.statBlock}>
              <StatRow label="phase" value={state.phase} />
              <StatRow label="chapter" value={state.chapterIndex || "-"} />
              <StatRow
                label="totalChapters"
                value={state.arcPlan?.totalChapters ?? "-"}
              />
              <StatRow label="ledger debt" value={ledgerOpen} hot={ledgerOpen > 0} />
              <StatRow
                label="last audit"
                value={audit ? `score ${audit.score?.toFixed(2) ?? "?"}` : "-"}
              />
              {fp && (
                <>
                  <StatRow label="POV" value={fp.povHint} />
                  <StatRow label="tense" value={fp.tenseHint} />
                  <StatRow label="avgSentLen" value={fp.avgSentenceLen?.toFixed(1)} />
                </>
              )}
            </div>
          )}

          {statusLine && <div style={cockpitStyles.status}>{statusLine}</div>}
          {err && <div style={cockpitStyles.error}>✗ {err}</div>}
        </div>
      )}

      {tab === "audit" && (
        <div style={cockpitStyles.body}>
          {!audit && <div style={cockpitStyles.muted}>No audit yet — run the pipeline through prose.</div>}
          {audit && (
            <>
              <div style={cockpitStyles.statBlock}>
                <StatRow label="audit score" value={audit.score?.toFixed(2)} />
                <StatRow label="findings" value={findings.length} hot={findings.length > 0} />
              </div>
              {findings.length === 0 ? (
                <div style={cockpitStyles.muted}>Clean. No findings.</div>
              ) : (
                <ul style={cockpitStyles.findingList}>
                  {findings.map((f, i) => (
                    <li key={i} style={{ ...cockpitStyles.finding, ...severityStyle(f.severity) }}>
                      <strong>{f.kind}</strong> · {f.severity}
                      <div>{f.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {tab === "reverse" && (
        <div style={cockpitStyles.body}>
          <div style={cockpitStyles.muted}>
            Paste a chapter (or excerpt) of existing prose. The model will infer
            which option each field most likely takes; you accept/reject
            field-by-field before applying back to the form.
          </div>
          <textarea
            style={cockpitStyles.textarea}
            value={reverseProse}
            onChange={(e) => setReverseProse(e.target.value)}
            placeholder="Paste prose here…"
            rows={8}
          />
          <div style={cockpitStyles.btnRow}>
            <button
              type="button"
              style={cockpitStyles.primaryBtn}
              onClick={runReverse}
              disabled={busy || !apiKey || !reverseProse.trim()}
            >
              {busy ? "◌ ANALYZING…" : "▸ REVERSE FROM PROSE"}
            </button>
            {reverseDiff && (
              <button
                type="button"
                style={cockpitStyles.primaryBtn}
                onClick={applyAccepted}
                disabled={busy || reverseDiff.accepted.size === 0}
              >
                ✓ APPLY {reverseDiff.accepted.size} ACCEPTED
              </button>
            )}
          </div>

          {reverseDiff && (
            <div style={{ marginTop: 12 }}>
              {Object.keys(reverseDiff.mapped).length === 0 && (
                <div style={cockpitStyles.muted}>No mappings returned.</div>
              )}
              {Object.entries(reverseDiff.mapped).map(([field, value]) => {
                const accepted = reverseDiff.accepted.has(field);
                const current = selections[field];
                const same = sameValue(current, value);
                return (
                  <div
                    key={field}
                    style={{
                      ...cockpitStyles.diffRow,
                      borderColor: accepted ? COCKPIT_COLOR.purple : COCKPIT_COLOR.border,
                    }}
                  >
                    <label style={cockpitStyles.diffLabel}>
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={() => toggleAccept(field)}
                        style={{ marginRight: 6 }}
                      />
                      <strong>{field}</strong>
                      {same && <em style={{ marginLeft: 6, color: COCKPIT_COLOR.muted }}>(same)</em>}
                    </label>
                    <div style={cockpitStyles.diffPair}>
                      <span style={cockpitStyles.diffOld}>
                        {current === undefined ? "—" : formatVal(current)}
                      </span>
                      <span style={cockpitStyles.diffArrow}>→</span>
                      <span style={cockpitStyles.diffNew}>{formatVal(value)}</span>
                    </div>
                  </div>
                );
              })}
              {reverseDiff.conflicts.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ ...cockpitStyles.eyebrow, color: COCKPIT_COLOR.amber }}>
                    // CONFLICTS
                  </div>
                  {reverseDiff.conflicts.map((c, i) => (
                    <div key={i} style={cockpitStyles.conflict}>
                      {typeof c === "string" ? c : c.message || JSON.stringify(c)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {statusLine && <div style={cockpitStyles.status}>{statusLine}</div>}
          {err && <div style={cockpitStyles.error}>✗ {err}</div>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function PhaseStrip({ phase, phaseIndex }) {
  return (
    <div style={cockpitStyles.phaseStrip}>
      {PHASES.map((p, i) => {
        const isActive = p === phase;
        const isPast = phaseIndex >= 0 && i < phaseIndex;
        return (
          <span
            key={p}
            style={{
              ...cockpitStyles.phasePill,
              ...(isActive ? cockpitStyles.phasePillActive : null),
              ...(isPast ? cockpitStyles.phasePillPast : null),
            }}
            title={p}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
}

function StatRow({ label, value, hot }) {
  return (
    <div style={cockpitStyles.statRow}>
      <span style={cockpitStyles.statLabel}>{label}</span>
      <span
        style={{
          ...cockpitStyles.statValue,
          color: hot ? COCKPIT_COLOR.red : COCKPIT_COLOR.text,
        }}
      >
        {String(value ?? "-")}
      </span>
    </div>
  );
}

function collectFindings(audit) {
  const buckets = [
    "continuity",
    "characterDrift",
    "foreshadow",
    "powerCurve",
    "castBloat",
    "voice",
    "promiseDebt",
  ];
  const out = [];
  for (const k of buckets) {
    const arr = audit[k] || [];
    for (const f of arr) out.push(f);
  }
  // sort error → warn → info
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
}

function severityStyle(sev) {
  if (sev === "error") {
    return { borderColor: COCKPIT_COLOR.red, background: COCKPIT_COLOR.redBg };
  }
  if (sev === "warn") {
    return { borderColor: COCKPIT_COLOR.amber, background: COCKPIT_COLOR.amberBg };
  }
  return { borderColor: COCKPIT_COLOR.border };
}

function sameValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return a === b;
}

function formatVal(v) {
  if (Array.isArray(v)) return v.join(", ");
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

// ---------------------------------------------------------------------------
// styles
// ---------------------------------------------------------------------------

const cockpitStyles = {
  fab: {
    position: "fixed",
    right: 16,
    bottom: 16,
    zIndex: 1500,
    padding: "10px 14px",
    border: `1px solid ${COCKPIT_COLOR.borderStrong}`,
    color: "#fff",
    fontFamily: COCKPIT_FONT,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 3,
    boxShadow: "0 4px 16px rgba(138,92,246,0.4)",
  },
  dock: {
    position: "fixed",
    right: 0,
    top: 0,
    bottom: 0,
    width: 420,
    maxWidth: "100vw",
    zIndex: 1500,
    background: COCKPIT_COLOR.bg,
    backdropFilter: "blur(6px)",
    borderLeft: `1px solid ${COCKPIT_COLOR.borderStrong}`,
    color: COCKPIT_COLOR.text,
    fontFamily: COCKPIT_FONT,
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "12px 14px",
    borderBottom: `1px solid ${COCKPIT_COLOR.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: COCKPIT_COLOR.purple,
  },
  closeBtn: {
    background: "transparent",
    color: COCKPIT_COLOR.muted,
    border: `1px solid ${COCKPIT_COLOR.border}`,
    padding: "4px 8px",
    cursor: "pointer",
    fontFamily: COCKPIT_FONT,
  },
  tabRow: {
    display: "flex",
    borderBottom: `1px solid ${COCKPIT_COLOR.border}`,
  },
  tab: {
    flex: 1,
    padding: "10px 12px",
    background: "transparent",
    color: COCKPIT_COLOR.muted,
    border: "none",
    borderRight: `1px solid ${COCKPIT_COLOR.border}`,
    fontFamily: COCKPIT_FONT,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
  },
  tabActive: {
    color: COCKPIT_COLOR.purpleLight,
    background: "rgba(138,92,246,0.08)",
    borderBottom: `2px solid ${COCKPIT_COLOR.purple}`,
  },
  body: {
    padding: 12,
    overflow: "auto",
    flex: 1,
  },
  phaseStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 12,
  },
  phasePill: {
    padding: "3px 6px",
    fontSize: 9,
    letterSpacing: 1,
    border: `1px solid ${COCKPIT_COLOR.border}`,
    color: COCKPIT_COLOR.dim,
    borderRadius: 2,
  },
  phasePillActive: {
    background: COCKPIT_COLOR.purple,
    color: "#fff",
    borderColor: COCKPIT_COLOR.purple,
  },
  phasePillPast: {
    color: COCKPIT_COLOR.purpleSoft,
    borderColor: COCKPIT_COLOR.borderStrong,
  },
  btnRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  primaryBtn: {
    background: COCKPIT_COLOR.purple,
    color: "#fff",
    border: `1px solid ${COCKPIT_COLOR.borderStrong}`,
    padding: "6px 10px",
    fontFamily: COCKPIT_FONT,
    fontSize: 10,
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 2,
  },
  utilityBtn: {
    background: "transparent",
    color: COCKPIT_COLOR.muted,
    border: `1px solid ${COCKPIT_COLOR.border}`,
    padding: "6px 10px",
    fontFamily: COCKPIT_FONT,
    fontSize: 10,
    letterSpacing: 2,
    cursor: "pointer",
  },
  statBlock: {
    border: `1px solid ${COCKPIT_COLOR.border}`,
    background: COCKPIT_COLOR.panel,
    padding: 8,
    marginBottom: 10,
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "2px 0",
    fontSize: 11,
  },
  statLabel: { color: COCKPIT_COLOR.muted },
  statValue: { color: COCKPIT_COLOR.text },
  status: {
    fontSize: 10,
    color: COCKPIT_COLOR.purpleLight,
    letterSpacing: 1,
    marginTop: 4,
  },
  error: {
    fontSize: 11,
    color: COCKPIT_COLOR.red,
    marginTop: 6,
    padding: 6,
    border: `1px solid ${COCKPIT_COLOR.red}`,
    background: COCKPIT_COLOR.redBg,
  },
  muted: {
    fontSize: 11,
    color: COCKPIT_COLOR.muted,
    margin: "8px 0",
  },
  findingList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  finding: {
    padding: 8,
    border: `1px solid ${COCKPIT_COLOR.border}`,
    marginBottom: 6,
    fontSize: 11,
    borderRadius: 2,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: COCKPIT_COLOR.panel,
    color: COCKPIT_COLOR.text,
    border: `1px solid ${COCKPIT_COLOR.border}`,
    fontFamily: COCKPIT_FONT,
    fontSize: 11,
    padding: 8,
    margin: "8px 0",
    resize: "vertical",
  },
  diffRow: {
    border: `1px solid ${COCKPIT_COLOR.border}`,
    padding: 6,
    marginBottom: 4,
    background: COCKPIT_COLOR.panel,
    borderRadius: 2,
  },
  diffLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    cursor: "pointer",
  },
  diffPair: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10,
    marginTop: 4,
    color: COCKPIT_COLOR.dim,
  },
  diffOld: {
    color: COCKPIT_COLOR.muted,
    textDecoration: "line-through",
  },
  diffArrow: { color: COCKPIT_COLOR.purple },
  diffNew: { color: COCKPIT_COLOR.purpleLight },
  conflict: {
    fontSize: 10,
    color: COCKPIT_COLOR.amber,
    padding: 4,
    border: `1px solid ${COCKPIT_COLOR.amber}`,
    background: COCKPIT_COLOR.amberBg,
    marginBottom: 4,
  },
};

export default PipelineCockpit;
