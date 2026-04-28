// src/components/stages/l3ShortStory.jsx
//
// L3 Short Story Stage — Generation and output display.
//
// Purpose: Takes locked L1+L2 artifacts and generates the short story seed using LLM.
// State management: Reads locked stages from storage, saves generated output to storage.getStage(projectId, 'short-story').
// UI pattern: Generation button + output preview panel.

import { useState, useEffect } from "react";
import { COLOR } from "../layerComponents.jsx";

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
    borderTop: `1px solid ${COLOR.border}`,
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
  btnPrimary: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Courier New', Courier, monospace",
    background: COLOR.purple,
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  output: {
    marginTop: "24px",
    padding: "16px",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "4px",
    whiteSpace: "pre-wrap",
    fontSize: "13px",
    lineHeight: 1.7,
  },
};

/**
 * L3 Short Story stage panel component
 *
 * @param {Object} props
 * @param {Object} props.storage - Storage adapter instance
 * @param {string} props.projectId - Current project ID
 * @param {Function} props.onGenerate - Callback to trigger generation: (projectId) => Promise<string>
 */
export function L3ShortStory({ storage, projectId, onGenerate }) {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(true);

  // Load existing output from storage on mount
  useEffect(() => {
    if (!storage || !projectId) return;

    async function loadStage() {
      setStageLoading(true);
      try {
        const stage = await storage.getStage(projectId, "short-story");
        if (stage && stage.artifact && stage.artifact.output) {
          setOutput(stage.artifact.output);
        }
      } catch (err) {
        console.error("Failed to load L3 short story stage:", err);
      } finally {
        setStageLoading(false);
      }
    }

    loadStage();
  }, [storage, projectId]);

  async function handleGenerate() {
    if (!onGenerate) {
      alert("Generation handler not provided. Connect to App.jsx generation logic.");
      return;
    }

    setLoading(true);
    try {
      const result = await onGenerate(projectId);
      setOutput(result);

      // Save to storage
      await storage.saveStage(projectId, "short-story", {
        output: result,
        generatedAt: Date.now(),
      });
    } catch (err) {
      console.error("Failed to generate short story:", err);
      alert("✗ Generation failed. See console for details.");
    } finally {
      setLoading(false);
    }
  }

  if (stageLoading) {
    return (
      <div style={S.panel}>
        <div style={{ textAlign: "center", color: COLOR.muted }}>Loading stage...</div>
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.title}>L3 — Short Story Generation</div>
        <div style={S.subtitle}>
          Generate a short story seed from your locked L1+L2 selections. This is the first output
          stage in the escalation pipeline.
        </div>
      </div>

      <button
        type="button"
        style={{ ...S.btnPrimary, opacity: loading ? 0.5 : 1 }}
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "⏳ GENERATING..." : "▶ GENERATE SHORT STORY"}
      </button>

      {output && (
        <div style={S.output}>
          <div style={{ color: COLOR.purpleLight, marginBottom: "12px", fontWeight: "600" }}>
            📄 GENERATED OUTPUT:
          </div>
          {output}
        </div>
      )}

      {!output && !loading && (
        <div style={{ ...S.output, color: COLOR.dim }}>
          No output yet. Click GENERATE to create your short story seed.
        </div>
      )}
    </div>
  );
}
