// src/components/layerComponents.jsx
//
// Shared Layer and Field rendering components extracted from App.jsx
// for reuse in wizard, power mode, and stage panels (L1 Seed, L2 Promise, etc.).

import { normalizeOption, buildFieldIndex, conflictsForOption } from "../lib/options.js";

// Color palette for UI consistency
export const COLOR = {
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
  amber: "#fbbf24",
  green: "#4ade80",
};

const S = {
  layerCard: {
    border: `1px solid ${COLOR.border}`,
    borderRadius: "4px",
    marginBottom: "16px",
    background: COLOR.panel,
  },
  layerHeader: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    cursor: "pointer",
    userSelect: "none",
  },
  layerNum: {
    fontSize: "9px",
    color: COLOR.dim,
    letterSpacing: "2px",
    marginRight: "12px",
    fontFamily: "monospace",
  },
  layerTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: COLOR.purpleLight,
    marginBottom: "2px",
  },
  layerSubtitle: {
    fontSize: "11px",
    color: COLOR.muted,
  },
  layerBody: {
    padding: "16px",
    borderTop: `1px solid ${COLOR.border}`,
  },
  groupTitle: {
    fontSize: "11px",
    color: COLOR.purple,
    letterSpacing: "1px",
    marginTop: "16px",
    marginBottom: "10px",
    fontWeight: "500",
  },
  fieldLabel: {
    display: "block",
    fontSize: "12px",
    color: COLOR.purpleSoft,
    marginBottom: "6px",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    fontFamily: "'Courier New', Courier, monospace",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "2px",
    color: COLOR.text,
    marginBottom: "12px",
  },
  freeformInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    fontFamily: "'Courier New', Courier, monospace",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "2px",
    color: COLOR.text,
    marginBottom: "12px",
  },
  multiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "8px",
    marginBottom: "12px",
  },
  chip: (active) => ({
    padding: "8px 12px",
    fontSize: "12px",
    fontFamily: "'Courier New', Courier, monospace",
    background: active ? "rgba(138,92,246,0.2)" : "rgba(255,255,255,0.02)",
    border: `1px solid ${active ? COLOR.borderStrong : COLOR.border}`,
    borderRadius: "3px",
    color: active ? COLOR.purpleLight : COLOR.text,
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "left",
  }),
};

/**
 * Field component — renders a single form field (select, multi-select, or freeform input)
 */
export function Field({ comp, value, onChange, fieldIndex, selections }) {
  // Freeform text input
  if (comp.freeform) {
    return (
      <div>
        <label style={S.fieldLabel}>{comp.label}</label>
        <input
          type="text"
          style={S.freeformInput}
          value={value || ""}
          placeholder={comp.placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  const normalized = (comp.options || []).map(normalizeOption).filter(Boolean);

  // Compute conflicts for each option
  const conflictMap = new Map();
  for (const opt of normalized) {
    const conflicts = fieldIndex
      ? conflictsForOption(fieldIndex, selections || {}, comp.id, opt)
      : [];
    conflictMap.set(opt.value, conflicts);
  }

  const conflictTooltip = (conflicts) =>
    conflicts
      .map((c) => `Incompatible with ${c.otherField} = "${c.currentValue}"`)
      .join(" • ");

  // Multi-select chips
  if (comp.multi) {
    const set = new Set(value || []);
    return (
      <div>
        <label style={S.fieldLabel}>
          {comp.label}{" "}
          <span style={{ color: COLOR.dim }}>
            ({set.size} selected
            {comp.min ? `, min ${comp.min}` : ""}
            {comp.max ? `, max ${comp.max}` : ""})
          </span>
        </label>
        <div style={S.multiGrid}>
          {normalized.map((o) => {
            const on = set.has(o.value);
            const conflicts = conflictMap.get(o.value) || [];
            const disabled = !on && conflicts.length > 0;
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                title={disabled ? conflictTooltip(conflicts) : o.description || undefined}
                onClick={() => {
                  if (disabled) return;
                  const next = new Set(set);
                  if (on) next.delete(o.value);
                  else {
                    if (comp.max && next.size >= comp.max) return;
                    next.add(o.value);
                  }
                  onChange([...next]);
                }}
                style={{
                  ...S.chip(on),
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {on ? "▣ " : disabled ? "⊘ " : "▢ "} {o.value}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Single-select dropdown
  const currentOpt = normalized.find((o) => o.value === value);
  return (
    <div>
      <label style={S.fieldLabel} title={currentOpt?.description || undefined}>
        {comp.label}
        {currentOpt?.description && (
          <span
            style={{
              marginLeft: 8,
              color: COLOR.dim,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            — {currentOpt.description}
          </span>
        )}
      </label>
      <select style={S.select} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {normalized.map((o) => {
          const conflicts = conflictMap.get(o.value) || [];
          const disabled = o.value !== value && conflicts.length > 0;
          return (
            <option
              key={o.value}
              value={o.value}
              disabled={disabled}
              title={disabled ? conflictTooltip(conflicts) : o.description || undefined}
            >
              {disabled ? "⊘ " : ""}
              {o.value}
              {disabled ? "  (conflicts)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/**
 * Layer component — renders a collapsible layer with groups and fields
 */
export function Layer({ layer, selections, setSelection, open, onToggle, fieldIndex }) {
  return (
    <div style={S.layerCard}>
      <div style={S.layerHeader} onClick={onToggle}>
        <div style={S.layerNum}>LAYER {layer.num}</div>
        <div style={{ flex: 1 }}>
          <div style={S.layerTitle}>{layer.title}</div>
          <div style={S.layerSubtitle}>{layer.subtitle}</div>
        </div>
        <div style={{ color: COLOR.purple, fontSize: "14px" }}>{open ? "▼" : "▶"}</div>
      </div>
      {open && (
        <div style={S.layerBody}>
          {layer.informational && (
            <div style={{ fontSize: "12px", color: COLOR.muted, lineHeight: 1.7 }}>
              The beat structure (Opening Image → Final Image) is synthesized automatically from
              your selections across Layers 1, 2, 4, and 8 when you click{" "}
              <span style={{ color: COLOR.purpleLight }}>GENERATE SEED</span>.
            </div>
          )}
          {layer.groups.map((g) => (
            <div key={g.id}>
              <div style={S.groupTitle}>{g.title}</div>
              {g.components.map((c) => (
                <Field
                  key={c.id}
                  comp={c}
                  value={selections[c.id]}
                  onChange={(v) => setSelection(c.id, v)}
                  fieldIndex={fieldIndex}
                  selections={selections}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
