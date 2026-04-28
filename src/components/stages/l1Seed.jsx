// src/components/stages/l1Seed.jsx
//
// L1 Seed Stage — Interview layer for premise / voice / core setup.
// Combines wizard steps 1-4: Preset + Macro + Mid + Subplot + Protagonist layers.
//
// Purpose: Collects foundational selections (subgenre, progression, theme, protagonist archetype)
// that seed the story's identity before promise/conflict layers in L2.
//
// State management: Reads/writes to storage.getStage(projectId, 'seed') + auto-save debouncing.
// UI pattern: Collapsible layer panels (reuses <Layer> from layerComponents.jsx).

import { useState, useEffect, useMemo, useRef } from "react";
import { Layer, COLOR } from "../layerComponents.jsx";
import { buildFieldIndex } from "../../lib/options.js";
import { LAYERS } from "../../data/layers.js";
import { PRESETS, findPreset } from "../../data/presets.js";
import { applyPreset } from "../../lib/presets.js";
import { computeCoherence } from "../../lib/coherence.js";
import { detectCombos, newlyTriggered } from "../../lib/combos.js";
import { CoherenceMeter, ComboToasts } from "../gamify.jsx";
import { CompanionBuilder } from "../gamify.jsx";
import { ProgressionLadder } from "../gamify.jsx";
import { generateSeedCandidates } from "../../lib/seed.js";

const DEBOUNCE_MS = 250;

const S = {
  panel: {
    padding: "20px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "'Courier New', Courier, monospace",
    color: COLOR.text,
  },
  header: {
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: `1px solid ${COLOR.border}`,
  },
  title: {
    fontSize: "20px",
    fontWeight: "600",
    color: COLOR.purpleLight,
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "13px",
    color: COLOR.muted,
    lineHeight: 1.6,
  },
  presetCard: {
    padding: "14px 16px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(138,92,246,0.05)",
    borderRadius: "3px",
    marginBottom: "24px",
  },
  presetEyebrow: {
    fontSize: "10px",
    color: COLOR.purple,
    letterSpacing: "3px",
    marginBottom: "10px",
  },
  historyRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  historySelect: {
    flex: 1,
    padding: "8px 10px",
    fontSize: "13px",
    fontFamily: "'Courier New', Courier, monospace",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "2px",
    color: COLOR.text,
  },
  restoreBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Courier New', Courier, monospace",
    background: COLOR.purple,
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  statusLine: {
    fontSize: "12px",
    color: COLOR.muted,
    marginTop: "8px",
  },
  footer: {
    marginTop: "32px",
    paddingTop: "20px",
    borderTop: `1px solid ${COLOR.border}`,
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
  },
  btnPrimary: {
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "'Courier New', Courier, monospace",
    background: COLOR.purple,
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  btnSecondary: {
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "'Courier New', Courier, monospace",
    background: "rgba(255,255,255,0.05)",
    color: COLOR.text,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  gamifyRow: {
    marginTop: "24px",
    padding: "16px",
    background: "rgba(138,92,246,0.03)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "4px",
  },
  advancedCard: {
    padding: "14px 16px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(138,92,246,0.05)",
    borderRadius: "3px",
    marginBottom: "24px",
  },
  advancedHeader: {
    fontSize: "10px",
    color: COLOR.purple,
    letterSpacing: "3px",
    marginBottom: "10px",
    cursor: "pointer",
    userSelect: "none",
  },
  advancedOptions: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    marginTop: "12px",
  },
  optionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  candidateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginTop: "12px",
  },
  candidateCard: {
    padding: "12px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(0,0,0,0.2)",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  candidateCardPicked: {
    borderColor: COLOR.purpleLight,
    background: "rgba(138,92,246,0.15)",
  },
  candidatePremise: {
    fontSize: "12px",
    color: COLOR.text,
    marginBottom: "8px",
    lineHeight: 1.4,
  },
  candidateTags: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  candidateTag: {
    padding: "2px 6px",
    fontSize: "9px",
    background: "rgba(138,92,246,0.2)",
    color: COLOR.purpleLight,
    borderRadius: "2px",
    letterSpacing: "1px",
  },
  generateBtn: {
    padding: "10px 20px",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Courier New', Courier, monospace",
    background: COLOR.purple,
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
    width: "100%",
  },
  pickBtn: {
    padding: "6px 12px",
    fontSize: "10px",
    fontWeight: "600",
    fontFamily: "'Courier New', Courier, monospace",
    background: "rgba(138,92,246,0.3)",
    color: COLOR.text,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
    width: "100%",
  },
};

/**
 * L1 Seed stage panel component
 *
 * @param {Object} props
 * @param {Object} props.storage - Storage adapter instance
 * @param {string} props.projectId - Current project ID
 * @param {Function} props.onLock - Callback when stage is locked: (stage, artifact) => void
 */
export function L1Seed({ storage, projectId, onLock }) {
  const [selections, setSelections] = useState({});
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetStatus, setPresetStatus] = useState("");
  const [openLayers, setOpenLayers] = useState({ macro: true });
  const [loading, setLoading] = useState(true);
  const [comboToasts, setComboToasts] = useState([]);
  const toastKeyRef = useRef(0);
  const saveTimerRef = useRef(null);
  const lastCombosRef = useRef(new Set());

  // Candidate generation state
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toneLean, setToneLean] = useState("balanced");
  const [useLive, setUseLive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Build field index for conflict detection
  const fieldIndex = useMemo(() => buildFieldIndex(LAYERS), []);

  // Compute coherence score for real-time feedback
  const coherence = useMemo(() => {
    try {
      return computeCoherence(selections, LAYERS);
    } catch {
      return null;
    }
  }, [selections]);

  // Detect combo triggers
  useEffect(() => {
    const combos = detectCombos(selections, LAYERS);
    const current = new Set(combos.map((c) => c.key));
    const fresh = newlyTriggered(current, lastCombosRef.current);
    lastCombosRef.current = current;

    if (fresh.length > 0) {
      setComboToasts((prev) => [
        ...prev,
        ...fresh.map((key) => {
          const combo = combos.find((c) => c.key === key);
          return { key: toastKeyRef.current++, label: combo?.label || key };
        }),
      ]);
    }
  }, [selections]);

  // Load stage data from storage on mount
  useEffect(() => {
    if (!storage || !projectId) return;

    async function loadStage() {
      setLoading(true);
      try {
        const stage = await storage.getStage("seed", projectId);
        if (stage && stage.artifact && typeof stage.artifact === "object") {
          setSelections(stage.artifact.selections || {});
        }
      } catch (err) {
        console.error("Failed to load L1 seed stage:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStage();
  }, [storage, projectId]);

  // Auto-save changes with debouncing (250ms)
  useEffect(() => {
    if (loading || !storage || !projectId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await storage.saveStage("seed", {
          projectId,
          version: 'latest',
          artifact: { selections },
        });
      } catch (err) {
        console.error("Failed to auto-save L1 seed:", err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [selections, storage, projectId, loading]);

  // Update a single selection field
  function setSelection(id, value) {
    setSelections((prev) => ({ ...prev, [id]: value }));
  }

  // Apply a preset
  async function handleApplyPreset() {
    if (!selectedPresetId) return;
    const preset = findPreset(selectedPresetId);
    if (!preset) return;

    const updated = applyPreset(selections, preset, LAYERS);
    setSelections(updated);
    setPresetStatus(`✓ Applied "${preset.label}" preset`);

    setTimeout(() => setPresetStatus(""), 3000);
  }

  // Lock stage (freeze current state as canonical)
  async function handleLockStage() {
    if (!storage || !projectId) return;

    // Get the picked candidate artifact
    const pickedCandidate = candidates.find(c => c.id === selectedCandidateId);
    if (!pickedCandidate) {
      alert("✗ Please pick a seed candidate before locking.");
      return;
    }

    try {
      await storage.lockStage(projectId, "seed", pickedCandidate.artifact);
      onLock?.("seed", pickedCandidate.artifact);
      alert("✓ L1 Seed locked. Canon snapshot saved.");
    } catch (err) {
      console.error("Failed to lock L1 seed:", err);
      alert("✗ Failed to lock stage. See console for details.");
    }
  }

  // Generate seed candidates
  async function handleGenerateCandidates() {
    if (!storage || !projectId) return;

    setGenerating(true);
    try {
      const apiKey = useLive ? import.meta.env.VITE_LLM_API_KEY : null;
      
      const generated = await generateSeedCandidates(selections, {
        storage,
        projectId,
        toneLean,
        apiKey,
        useLive,
      });

      // Save candidates to database
      const savedCandidates = [];
      for (const candidate of generated) {
        const saved = await storage.saveCandidate({
          projectId,
          stageKey: 'seed',
          artifact: candidate.artifact,
        });
        savedCandidates.push(saved);
      }

      setCandidates(savedCandidates);
    } catch (err) {
      console.error("Failed to generate seed candidates:", err);
      alert(`✗ Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  // Pick a candidate
  async function handlePickCandidate(candidateId) {
    if (!storage) return;

    try {
      await storage.pickCandidate(candidateId);
      setSelectedCandidateId(candidateId);
    } catch (err) {
      console.error("Failed to pick candidate:", err);
    }
  }

  // Toggle layer open/close
  function toggleLayer(layerId) {
    setOpenLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  }

  if (loading) {
    return (
      <div style={S.panel}>
        <div style={{ textAlign: "center", color: COLOR.muted }}>Loading seed stage...</div>
      </div>
    );
  }

  // Get the relevant layers for L1: macro, mid, subplots, protagonist
  const l1Layers = LAYERS.filter((layer) =>
    ["macro", "mid", "subplots", "protagonist"].includes(layer.id)
  );

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.title}>L1 — Seed</div>
        <div style={S.subtitle}>
          Foundational setup: subgenre, progression mechanics, core archetype, and subplot mix.
          Locking this stage freezes your premise before building the promise layer.
        </div>
      </div>

      {/* Preset picker (optional starting point) */}
      <div style={S.presetCard}>
        <div style={S.presetEyebrow}>// OPTIONAL — START FROM A PRESET</div>
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
          <div style={S.statusLine}>{findPreset(selectedPresetId)?.description}</div>
        )}
        {presetStatus && (
          <div style={{ ...S.statusLine, color: COLOR.purpleLight }}>{presetStatus}</div>
        )}
        <div style={{ ...S.statusLine, color: COLOR.dim }}>
          You can skip this and pick everything by hand.
        </div>
      </div>

      {/* Advanced Options — Candidate Generation */}
      <div style={S.advancedCard}>
        <div style={S.advancedHeader} onClick={() => setAdvancedOpen(!advancedOpen)}>
          {advancedOpen ? "▼" : "▶"} ADVANCED OPTIONS — GENERATE SEED CANDIDATES
        </div>
        {advancedOpen && (
          <>
            <div style={S.advancedOptions}>
              <div style={S.optionGroup}>
                <label style={{ fontSize: "11px", color: COLOR.muted }}>Tone Lean:</label>
                <select
                  style={S.historySelect}
                  value={toneLean}
                  onChange={(e) => setToneLean(e.target.value)}
                >
                  <option value="darker">Darker</option>
                  <option value="balanced">Balanced</option>
                  <option value="lighter">Lighter</option>
                </select>
              </div>
              <div style={S.optionGroup}>
                <input
                  type="checkbox"
                  checked={useLive}
                  onChange={(e) => setUseLive(e.target.checked)}
                  id="useLiveCheckbox"
                />
                <label htmlFor="useLiveCheckbox" style={{ fontSize: "11px", color: useLive ? COLOR.purpleLight : COLOR.muted }}>
                  🔴 LIVE LLM
                </label>
              </div>
            </div>
            <button
              type="button"
              style={{ ...S.generateBtn, marginTop: "12px" }}
              onClick={handleGenerateCandidates}
              disabled={generating}
            >
              {generating ? "⏳ GENERATING..." : "✨ GENERATE 3 CANDIDATES"}
            </button>

            {/* Candidate browser */}
            {candidates.length > 0 && (
              <div style={S.candidateGrid}>
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    style={{
                      ...S.candidateCard,
                      ...(candidate.id === selectedCandidateId ? S.candidateCardPicked : {}),
                    }}
                  >
                    <div style={S.candidatePremise}>{candidate.artifact.premise}</div>
                    <div style={S.candidateTags}>
                      <span style={S.candidateTag}>{candidate.artifact.genre}</span>
                      <span style={S.candidateTag}>{candidate.artifact.tone}</span>
                    </div>
                    <button
                      type="button"
                      style={S.pickBtn}
                      onClick={() => handlePickCandidate(candidate.id)}
                    >
                      {candidate.id === selectedCandidateId ? "✓ PICKED" : "PICK"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Layer panels */}
      {l1Layers.map((layer) => (
        <Layer
          key={layer.id}
          layer={layer}
          selections={selections}
          setSelection={setSelection}
          open={openLayers[layer.id] || false}
          onToggle={() => toggleLayer(layer.id)}
          fieldIndex={fieldIndex}
        />
      ))}

      {/* Companion builder (integrated with protagonist layer) */}
      {openLayers.protagonist && (
        <CompanionBuilder
          selections={selections}
          setCompanions={(ids) => setSelections((prev) => ({ ...prev, companions: ids }))}
        />
      )}

      {/* Progression ladder (integrated with mid layer) */}
      {openLayers.mid && (
        <ProgressionLadder
          selections={selections}
          setPins={(pins) => setSelections((prev) => ({ ...prev, progressionPins: pins }))}
        />
      )}

      {/* Gamification feedback */}
      <div style={S.gamifyRow}>
        {coherence && <CoherenceMeter coherence={coherence} />}
        <ComboToasts toasts={comboToasts} onDismiss={(key) => setComboToasts((prev) => prev.filter((t) => t.key !== key))} />
      </div>

      {/* Footer actions */}
      <div style={S.footer}>
        <button type="button" style={S.btnSecondary} onClick={() => setSelections({})}>
          CLEAR ALL
        </button>
        <button
          type="button"
          style={{
            ...S.btnPrimary,
            opacity: selectedCandidateId ? 1 : 0.5,
            cursor: selectedCandidateId ? "pointer" : "not-allowed",
          }}
          onClick={handleLockStage}
          disabled={!selectedCandidateId}
        >
          🔒 LOCK & ADVANCE TO L2
        </button>
      </div>
    </div>
  );
}
