// src/components/stages/l2Promise.jsx
//
// L2 Promise Stage — Story shaping layer for texture, tone, and series arc.
// Combines wizard steps 5-7: Beats + Micro + Series + Theme layers.
//
// Purpose: Refines the seed's foundation with execution details (tone, pacing, series hooks)
// and thematic anchors. Locks promise artifact before generation in L3.
//
// State management: Reads/writes to storage.getStage(projectId, 'promise') + auto-save debouncing.
// UI pattern: Collapsible layer panels (reuses <Layer> from layerComponents.jsx).

import { useState, useEffect, useMemo, useRef } from "react";
import { Layer, COLOR } from "../layerComponents.jsx";
import { buildFieldIndex } from "../../lib/options.js";
import { LAYERS } from "../../data/layers.js";
import { computeCoherence } from "../../lib/coherence.js";
import { detectCombos, newlyTriggered } from "../../lib/combos.js";
import { CoherenceMeter, ComboToasts } from "../gamify.jsx";
import { generatePromiseCandidates } from "../../lib/promise.js";

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
  infoBox: {
    padding: "14px 16px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(138,92,246,0.03)",
    borderRadius: "3px",
    marginBottom: "24px",
    fontSize: "12px",
    color: COLOR.muted,
    lineHeight: 1.7,
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
  seedBox: {
    padding: "12px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(0,0,0,0.2)",
    borderRadius: "3px",
    marginBottom: "12px",
    fontSize: "11px",
    color: COLOR.muted,
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
  candidateText: {
    fontSize: "11px",
    color: COLOR.text,
    marginBottom: "6px",
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
};

/**
 * L2 Promise stage panel component
 *
 * @param {Object} props
 * @param {Object} props.storage - Storage adapter instance
 * @param {string} props.projectId - Current project ID
 * @param {Function} props.onLock - Callback when stage is locked: (stage, artifact) => void
 */
export function L2Promise({ storage, projectId, onLock }) {
  const [selections, setSelections] = useState({});
  const [openLayers, setOpenLayers] = useState({ beats: true });
  const [loading, setLoading] = useState(true);
  const [comboToasts, setComboToasts] = useState([]);
  const toastKeyRef = useRef(0);
  const saveTimerRef = useRef(null);
  const lastCombosRef = useRef(new Set());

  // Candidate generation state
  const [seedArtifact, setSeedArtifact] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [stakesMagnitude, setStakesMagnitude] = useState("medium");
  const [endingShape, setEndingShape] = useState("bittersweet");
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

  // Load stage data and locked seed from storage on mount
  useEffect(() => {
    if (!storage || !projectId) return;

    async function loadStage() {
      setLoading(true);
      try {
        const stage = await storage.getStage("promise", projectId);
        if (stage && stage.artifact && typeof stage.artifact === "object") {
          setSelections(stage.artifact.selections || {});
        }

        // Load locked seed from canon premise
        const canonPremise = await storage.getCanon('premise', projectId);
        if (canonPremise) {
          setSeedArtifact(canonPremise);
        }
      } catch (err) {
        console.error("Failed to load L2 promise stage:", err);
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
        await storage.saveStage("promise", {
          projectId,
          version: 'latest',
          artifact: { selections },
        });
      } catch (err) {
        console.error("Failed to auto-save L2 promise:", err);
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

  // Lock stage (freeze current state as canonical)
  async function handleLockStage() {
    if (!storage || !projectId) return;

    // Get the picked candidate artifact
    const pickedCandidate = candidates.find(c => c.id === selectedCandidateId);
    if (!pickedCandidate) {
      alert("✗ Please pick a promise candidate before locking.");
      return;
    }

    try {
      await storage.lockStage(projectId, "promise", pickedCandidate.artifact);
      onLock?.("promise", pickedCandidate.artifact);
      alert("✓ L2 Promise locked. Canon snapshot saved.");
    } catch (err) {
      console.error("Failed to lock L2 promise:", err);
      alert("✗ Failed to lock stage. See console for details.");
    }
  }

  // Generate promise candidates
  async function handleGenerateCandidates() {
    if (!storage || !projectId) return;

    if (!seedArtifact) {
      alert("✗ No locked seed found. Please complete L1 first.");
      return;
    }

    setGenerating(true);
    try {
      const apiKey = useLive ? import.meta.env.VITE_LLM_API_KEY : null;
      
      const generated = await generatePromiseCandidates(seedArtifact, selections, {
        storage,
        projectId,
        stakesMagnitude,
        endingShape,
        apiKey,
        useLive,
      });

      // Save candidates to database
      const savedCandidates = [];
      for (const candidate of generated) {
        const saved = await storage.saveCandidate({
          projectId,
          stageKey: 'promise',
          artifact: candidate.artifact,
        });
        savedCandidates.push(saved);
      }

      setCandidates(savedCandidates);
    } catch (err) {
      console.error("Failed to generate promise candidates:", err);
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
        <div style={{ textAlign: "center", color: COLOR.muted }}>Loading promise stage...</div>
      </div>
    );
  }

  // Get the relevant layers for L2: beats, micro, series, theme
  const l2Layers = LAYERS.filter((layer) =>
    ["beats", "micro", "series", "theme"].includes(layer.id)
  );

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.title}>L2 — Promise</div>
        <div style={S.subtitle}>
          Story shaping: tone, pacing, series arc, and thematic anchors. Locking this stage
          finalizes your execution blueprint before generation.
        </div>
      </div>

      {/* Info box for beats layer (informational, not editable) */}
      <div style={S.infoBox}>
        <strong style={{ color: COLOR.purpleLight }}>📝 Beat Structure (Layer 5):</strong>
        <br />
        The 15-beat Save the Cat structure (Opening Image → Final Image) is synthesized
        automatically from your selections across Layers 1, 2, 4, and 8 when you generate the
        seed in L3. This layer is informational only.
      </div>

      {/* Advanced Options — Candidate Generation */}
      <div style={S.advancedCard}>
        <div style={S.advancedHeader} onClick={() => setAdvancedOpen(!advancedOpen)}>
          {advancedOpen ? "▼" : "▶"} ADVANCED OPTIONS — GENERATE PROMISE CANDIDATES
        </div>
        {advancedOpen && (
          <>
            {/* Show locked seed artifact */}
            {seedArtifact && (
              <div style={S.seedBox}>
                <strong style={{ color: COLOR.purpleLight }}>Locked Seed (L1):</strong>
                <br />
                {seedArtifact.premise}
                <br />
                <span style={{ fontSize: "10px", color: COLOR.dim }}>
                  {seedArtifact.genre} • {seedArtifact.tone}
                </span>
              </div>
            )}

            {!seedArtifact && (
              <div style={S.seedBox}>
                <strong style={{ color: COLOR.purpleLight }}>⚠️ No locked seed found</strong>
                <br />
                Please complete L1 Seed stage first.
              </div>
            )}

            <div style={S.advancedOptions}>
              <div style={S.optionGroup}>
                <label style={{ fontSize: "11px", color: COLOR.muted }}>Stakes:</label>
                <select
                  style={S.historySelect}
                  value={stakesMagnitude}
                  onChange={(e) => setStakesMagnitude(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div style={S.optionGroup}>
                <label style={{ fontSize: "11px", color: COLOR.muted }}>Ending:</label>
                <select
                  style={S.historySelect}
                  value={endingShape}
                  onChange={(e) => setEndingShape(e.target.value)}
                >
                  <option value="tragic">Tragic</option>
                  <option value="bittersweet">Bittersweet</option>
                  <option value="hopeful">Hopeful</option>
                </select>
              </div>
              <div style={S.optionGroup}>
                <input
                  type="checkbox"
                  checked={useLive}
                  onChange={(e) => setUseLive(e.target.checked)}
                  id="useLiveCheckboxPromise"
                />
                <label htmlFor="useLiveCheckboxPromise" style={{ fontSize: "11px", color: useLive ? COLOR.purpleLight : COLOR.muted }}>
                  🔴 LIVE LLM
                </label>
              </div>
            </div>
            <button
              type="button"
              style={{ ...S.generateBtn, marginTop: "12px" }}
              onClick={handleGenerateCandidates}
              disabled={generating || !seedArtifact}
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
                    <div style={S.candidateText}>
                      <strong>{candidate.artifact.protagonist}</strong>
                    </div>
                    <div style={S.candidateText}>
                      Wants: {candidate.artifact.want}
                    </div>
                    <div style={S.candidateText}>
                      Obstacle: {candidate.artifact.obstacle}
                    </div>
                    <div style={S.candidateTags}>
                      <span style={S.candidateTag}>{candidate.artifact.endingShape}</span>
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
      {l2Layers.map((layer) => {
        // Skip beats layer (informational only, shown in info box above)
        if (layer.id === "beats") return null;

        return (
          <Layer
            key={layer.id}
            layer={layer}
            selections={selections}
            setSelection={setSelection}
            open={openLayers[layer.id] || false}
            onToggle={() => toggleLayer(layer.id)}
            fieldIndex={fieldIndex}
          />
        );
      })}

      {/* Gamification feedback */}
      <div style={S.gamifyRow}>
        {coherence && <CoherenceMeter coherence={coherence} />}
        <ComboToasts
          toasts={comboToasts}
          onDismiss={(key) => setComboToasts((prev) => prev.filter((t) => t.key !== key))}
        />
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
          🔒 LOCK & ADVANCE TO L3
        </button>
      </div>
    </div>
  );
}
