// src/components/stages/l5Novel.jsx
//
// L5 Novel Outline Stage — Placeholder for M4 milestone.
//
// Purpose: Expands L4 novella into full novel beat sheet and scene cards.
// Coming in M4: 15-beat Save the Cat expansion, scene-by-scene breakdown, tension mapping.

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
 * L5 Novel stage panel component (placeholder)
 */
export function L5Novel() {
  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.title}>L5 — Novel Outline</div>
        <div style={S.subtitle}>
          Beat sheet for full-length novel (80k-120k words). Scene-by-scene breakdown with tension
          mapping and character arc tracking.
        </div>
      </div>

      <div style={S.placeholder}>
        <div style={S.placeholderTitle}>🚧 Coming in Milestone 4</div>
        <div style={S.placeholderText}>
          This stage will include:
          <br />• 15-beat Save the Cat expansion editor
          <br />• Scene-by-scene card layout (Scrivener-style)
          <br />• Tension curve mapping (rising action → climax → denouement)
          <br />• Character arc tracker (per-POV protagonist journey)
          <br />• Auto-sync with L4 arc structure
          <br />
          <br />
          For now, use L4 Novella tools and scale manually.
        </div>
      </div>
    </div>
  );
}
