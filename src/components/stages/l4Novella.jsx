// src/components/stages/l4Novella.jsx
//
// L4 Novella Outline Stage — Placeholder for M3 milestone.
//
// Purpose: Expands L3 short story into novella-length arc planner.
// Coming in M3: Arc structure, chapter breakdown, subplot weaving.

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
    textAlign: "center",
  },
  placeholderTitle: {
    fontSize: "16px",
    color: COLOR.purpleSoft,
    marginBottom: "12px",
  },
  placeholderText: {
    fontSize: "12px",
    color: COLOR.dim,
    lineHeight: 1.7,
  },
};

/**
 * L4 Novella stage panel component (placeholder)
 */
export function L4Novella() {
  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.title}>L4 — Novella Outline</div>
        <div style={S.subtitle}>
          Arc planner for novella-length expansion (20k-50k words). Adds subplot structure,
          chapter breakdown, and pacing controls.
        </div>
      </div>

      <div style={S.placeholder}>
        <div style={S.placeholderTitle}>🚧 Coming in Milestone 3</div>
        <div style={S.placeholderText}>
          This stage will include:
          <br />• Arc structure editor (3-act or 5-act)
          <br />• Chapter outline generator
          <br />• Subplot weaving controls
          <br />• Pacing curve visualization
          <br />
          <br />
          For now, use L3 Short Story generation and expand manually.
        </div>
      </div>
    </div>
  );
}
