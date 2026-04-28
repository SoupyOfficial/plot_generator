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
        const stage = await storage.getStage(projectId, "promise");
        if (stage && stage.artifact && typeof stage.artifact === "object") {
          setSelections(stage.artifact.selections || {});
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
        await storage.saveStage(projectId, "promise", {
          selections,
          savedAt: Date.now(),
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

    try {
      const artifact = {
        selections,
        coherence,
        lockedAt: Date.now(),
      };
      await storage.lockStage(projectId, "promise", artifact);
      onLock?.("promise", artifact);
      alert("✓ L2 Promise locked. Canon snapshot saved.");
    } catch (err) {
      console.error("Failed to lock L2 promise:", err);
      alert("✗ Failed to lock stage. See console for details.");
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
        <button type="button" style={S.btnPrimary} onClick={handleLockStage}>
          🔒 LOCK PROMISE STAGE
        </button>
      </div>
    </div>
  );
}
