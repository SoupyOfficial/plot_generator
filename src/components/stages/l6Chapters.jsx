// src/components/stages/l6Chapters.jsx
//
// L6 Chapters Stage — Chapter-by-chapter state machine (migrated from PipelineCockpit).
//
// Purpose: Manages the full pipeline from draft → revision → final for each chapter.
// Migration target: PipelineCockpit state machine + progress tracking.
//
// TODO: Complete migration from pipelineCockpit.jsx in task 4 implementation.

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
  placeholder: {
    marginTop: "32px",
    padding: "24px",
    background: "rgba(138,92,246,0.05)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "4px",
  },
  placeholderText: {
    fontSize: "12px",
    color: COLOR.dim,
    lineHeight: 1.7,
  },
};

/**
 * L6 Chapters stage panel component
 *
 * @param {Object} props
 * @param {Object} props.storage - Storage adapter instance
 * @param {string} props.projectId - Current project ID
 */
export function L6Chapters({ storage, projectId }) {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storage || !projectId) return;

    async function loadStage() {
      setLoading(true);
      try {
        const stage = await storage.getStage(projectId, "chapters");
        if (stage && stage.artifact && stage.artifact.chapters) {
          setChapters(stage.artifact.chapters);
        }
      } catch (err) {
        console.error("Failed to load L6 chapters stage:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStage();
  }, [storage, projectId]);

  if (loading) {
    return (
      <div style={S.panel}>
        <div style={{ textAlign: "center", color: COLOR.muted }}>Loading chapters...</div>
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.title}>L6 — Chapter Pipeline</div>
        <div style={S.subtitle}>
          Chapter-by-chapter state machine for managing draft → revision → final workflow. Migrated
          from PipelineCockpit (M1 legacy component).
        </div>
      </div>

      <div style={S.placeholder}>
        <div style={S.placeholderText}>
          <strong style={{ color: COLOR.purpleLight }}>🚧 Migration in progress</strong>
          <br />
          <br />
          This panel will replace the PipelineCockpit component with integrated storage persistence.
          <br />
          <br />
          Planned features:
          <br />• Chapter list with status indicators (draft/revision/final)
          <br />• Per-chapter actions (generate, revise, export)
          <br />• Progress tracking (X of Y chapters complete)
          <br />• Version history per chapter
          <br />
          <br />
          {chapters.length > 0
            ? `Currently tracking ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}.`
            : "No chapters yet. Define chapters in L5 Novel Outline first."}
        </div>
      </div>
    </div>
  );
}
