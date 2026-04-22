import { useState } from "react";

export const SYSTEM_STORY_DESIGN = {
  coreprinciple: {
    title: "Core Principle",
    content: "A system story should end when the system's purpose is resolved and/or the protagonist achieves an outcome that stabilizes or settles the initial disruption introduced by the system.",
    subcontent: ["The system ends, changes, or is fulfilled", "Society adapts and reaches a new equilibrium", "The protagonist resolves the core conflict introduced at the beginning"]
  },
  archetypes: [
    { id: "selection", label: "Selection", goal: "Identify the strongest / most fit", endings: ["Completion (chosen)", "Rejection (refuse system)", "Subversion (criteria is flawed)"] },
    { id: "training", label: "Training", goal: "Prepare for a future event", endings: ["Payoff (threat arrives)", "Failure (trained for wrong outcome)", "Twist (system caused the threat)"] },
    { id: "harvesting", label: "Resource Harvesting", goal: "Extract value (energy, data, emotion)", endings: ["Exposure", "Takeover", "Moral choice (benefit vs destruction)"] },
    { id: "simulation", label: "Simulation / Experiment", goal: "Test individuals or civilizations", endings: ["Escape", "Break experiment validity", "Confront observers"] },
    { id: "evolution", label: "Evolution", goal: "Force advancement of species/world", endings: ["Completion (evolution achieved)", "Rejection (retain humanity)", "Transformation (become something new)"] },
    { id: "control", label: "Control / Stability", goal: "Maintain order or prevent collapse", endings: ["Validation (system is necessary)", "Overthrow (too oppressive)", "Balance (partial control retained)"] },
    { id: "entertainment", label: "Entertainment", goal: "Provide spectacle to observers", endings: ["Audience reveal", "Revolt", "Strategic participation"] },
    { id: "data", label: "Data Accumulation", goal: "Gather knowledge", endings: ["Completion (data sufficient)", "Interpretation (meaning revealed)", "Misuse (unexpected application)"] },
    { id: "moral", label: "Moral / Ethical", goal: "Judge worth or decisions", endings: ["Judgment (pass/fail)", "Rejection (system flawed)", "Redefinition (new morality)"] },
    { id: "selfpres", label: "Self-Preservation", goal: "Ensure its own survival", endings: ["Destruction", "Merge", "Coexistence"] },
  ],
  resolutionModes: [
    { label: "Fulfillment", desc: "System achieves its goal" },
    { label: "Exposure", desc: "True purpose revealed and rejected" },
    { label: "Subversion", desc: "Goal redefined by protagonist" },
    { label: "Replacement", desc: "New system or purpose established" },
    { label: "Stabilization", desc: "World adapts and reaches a steady state" },
  ],
  progressionTiers: [
    { tier: 1, label: "Survival" },
    { tier: 2, label: "Understanding" },
    { tier: 3, label: "Exploitation" },
    { tier: 4, label: "Control" },
    { tier: 5, label: "Confrontation" },
    { tier: 6, label: "Resolution / Stabilization" },
  ],
  themes: ["Power vs Humanity", "Control vs Freedom", "Survival vs Morality", "Progress vs Identity", "Knowledge vs Consequence"],
  highValueCombos: [
    { title: "Training + External Threat + Twist", desc: "System prepares → threat arrives → system is flawed or responsible" },
    { title: "Evolution + Control Conflict", desc: "Growth vs humanity dilemma" },
    { title: "Simulation + Data + Self-Preservation", desc: "System learns → protagonist becomes unmodelable variable" },
  ],
  checklist: [
    "What is the system's goal?",
    "What happens when it succeeds?",
     "Who benefits?",
    "Does the protagonist agree?",
    "What does 'stability' look like at the end?",
  ],
  designDecisions: [
    { title: "System Definition", items: ["What is the system optimizing for?", "What is the visible purpose vs hidden purpose?"] },
    { title: "Creator Intent", items: ["Who created the system?", "Do they still agree with its goal?"] },
    { title: "Completion Condition", items: ["What does 'system success' look like?", "Does that end the system or transition it?"] },
  ],
};
const NAV = [
  { id: "archetypes", label: "Archetypes" },
  { id: "resolution", label: "Resolution" },
  { id: "progression", label: "Progression" },
  { id: "design", label: "Design" },
  { id: "themes", label: "Themes" },
  { id: "checklist", label: "Checklist" },
];
const systemNatureColors = {
  Good: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.4)", text: "#4ade80" },
  Bad: { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.4)", text: "#f87171" },
  Necessary: { bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.4)", text: "#facc15" },
};
export default function App() {
  const [activeSection, setActiveSection] = useState("archetypes");
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const toggleCheck = (i) => setCheckedItems(p => ({ ...p, [i]: !p[i] }));
  const allChecked = SYSTEM_STORY_DESIGN.checklist.every((_, i) => checkedItems[i]);
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e2e0f0",
      fontFamily: "'Courier New', Courier, monospace",
      position: "relative",
      overflowX: "hidden",
    }}>
      {/* Ambient grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(138,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(138,92,246,0.04) 1px, transparent 1px)",
backgroundSize: "40px 40px",
      }} />
      {/* Glow orbs */}
      <div style={{ position: "fixed", top: "-120px", left: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(138,92,246,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-80px", right: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Header */}
        <div style={{ padding: "48px 0 32px", borderBottom: "1px solid rgba(138,92,246,0.2)" }}>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#8a5cf6", marginBottom: "12px", textTransform: "uppercase" }}>System Design Reference</div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 400, letterSpacing: "2px", color: "#f0eeff", lineHeight: 1.2 }}>
            PROGRESSION FANTASY<br />
            <span style={{ color: "#8a5cf6" }}>// SYSTEM ARCHITECTURE</span>
          </h1>
          <p style={{ marginTop: "16px", fontSize: "13px", color: "#7c78a0", lineHeight: 1.7, maxWidth: "560px" }}>
            {SYSTEM_STORY_DESIGN.coreprinciple.content}
          </p>
          <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {SYSTEM_STORY_DESIGN.coreprinciple.subcontent.map((s, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "4px 10px", border: "1px solid rgba(138,92,246,0.3)", borderRadius: "2px", color: "#a78bfa", background: "rgba(138,92,246,0.06)" }}>
                {s}
              </span>
            ))}
          </div>
        </div>
        {/* Nav */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "20px 0", borderBottom: "1px solid rgba(138,92,246,0.1)" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveSection(n.id)} style={{
              background: activeSection === n.id ? "rgba(138,92,246,0.2)" : "transparent",
              border: activeSection === n.id ? "1px solid rgba(138,92,246,0.6)" : "1px solid rgba(138,92,246,0.15)",
              color: activeSection === n.id ? "#c4b5fd" : "#6b6890",
              padding: "6px 14px", fontSize: "11px", letterSpacing: "2px", cursor: "pointer",
              textTransform: "uppercase", borderRadius: "2px", transition: "all 0.2s",
            }}>{n.label}</button>
          ))}
        </div>
        {/* ARCHETYPES */}
        {activeSection === "archetypes" && (
          <div style={{ paddingTop: "28px" }}>
            <SectionHeader label="2" title="System Goal Archetypes" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", marginTop: "20px" }}>
              {SYSTEM_STORY_DESIGN.archetypes.map((a) => (
 <div key={a.id} onClick={() => setSelectedArchetype(selectedArchetype?.id === a.id ? null : a)}
                  style={{
                    border: selectedArchetype?.id === a.id ? "1px solid rgba(138,92,246,0.7)" : "1px solid rgba(138,92,246,0.15)",
                    background: selectedArchetype?.id === a.id ? "rgba(138,92,246,0.1)" : "rgba(255,255,255,0.02)",
                    padding: "16px", cursor: "pointer", borderRadius: "3px",
                    transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: "10px", color: "#8a5cf6", letterSpacing: "3px", marginBottom: "6px", textTransform: "uppercase" }}>System</div>
                  <div style={{ fontSize: "14px", color: "#e2e0f0", fontWeight: 600, marginBottom: "8px" }}>{a.label}</div>
                  <div style={{ fontSize: "12px", color: "#7c78a0", lineHeight: 1.5 }}>{a.goal}</div>
                  {selectedArchetype?.id === a.id && (
                    <div style={{ marginTop: "14px", borderTop: "1px solid rgba(138,92,246,0.2)", paddingTop: "12px" }}>
                      <div style={{ fontSize: "10px", color: "#8a5cf6", letterSpacing: "2px", marginBottom: "8px" }}>ENDINGS</div>
                      {a.endings.map((e, i) => (
                        <div key={i} style={{ fontSize: "12px", color: "#c4b5fd", padding: "4px 0", borderBottom: i < a.endings.length - 1 ? "1px solid rgba(138,92,246,0.1)" : "none" }}>
                          → {e}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Alignment table */}
            <div style={{ marginTop: "32px" }}>
              <div style={{ fontSize: "11px", color: "#6b6890", letterSpacing: "3px", marginBottom: "14px", textTransform: "uppercase" }}>System + Ending Alignment</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.entries(systemNatureColors).map(([nature, c]) => (
                  <div key={nature} style={{ border: `1px solid ${c.border}`, background: c.bg, padding: "14px 18px", borderRadius: "3px" }}>
                    <div style={{ fontSize: "12px", color: c.text, letterSpacing: "2px", marginBottom: "6px" }}>{nature.toUpperCase()}</div>
                    <div style={{ fontSize: "12px", color: "#a0a0c0" }}>
                      {nature === "Good" && "Fulfillment, Stabilization"}
                      {nature === "Bad" && "Exposure, Destruction"}
                      {nature === "Necessary" && "Subversion, Balance, Stabilization"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* High value combos */}
            <div style={{ marginTop: "32px" }}>
              <div style={{ fontSize: "11px", color: "#6b6890", letterSpacing: "3px", marginBottom: "14px", textTransform: "uppercase" }}>High-Value Combinations</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {SYSTEM_STORY_DESIGN.highValueCombos.map((c, i) => (
                  <div key={i} style={{ border: "1px solid rgba(56,189,248,0.2)", background: "rgba(56,189,248,0.04)", padding: "14px 18px", borderRadius: "3px" }}>
 <div style={{ fontSize: "12px", color: "#38bdf8", marginBottom: "5px" }}>{c.title}</div>
                    <div style={{ fontSize: "12px", color: "#7c78a0" }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* RESOLUTION */}
        {activeSection === "resolution" && (
          <div style={{ paddingTop: "28px" }}>
            <SectionHeader label="3" title="Terminal Resolution Modes" />
            <p style={{ fontSize: "12px", color: "#6b6890", marginBottom: "24px" }}>Every system ending should fall into one or more of these categories.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {SYSTEM_STORY_DESIGN.resolutionModes.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "18px", border: "1px solid rgba(138,92,246,0.15)", background: "rgba(255,255,255,0.02)", padding: "18px 20px", borderRadius: "3px" }}>
                  <div style={{ fontSize: "22px", color: "rgba(138,92,246,0.3)", fontWeight: 700, minWidth: "28px", marginTop: "-2px" }}>0{i + 1}</div>
                  <div>
                    <div style={{ fontSize: "14px", color: "#c4b5fd", marginBottom: "5px", letterSpacing: "1px" }}>{r.label}</div>
                    <div style={{ fontSize: "12px", color: "#7c78a0" }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "32px" }}>
              <div style={{ fontSize: "11px", color: "#6b6890", letterSpacing: "3px", marginBottom: "14px", textTransform: "uppercase" }}>Anti-Drift Constraints</div>
              {["Define a hard system ceiling", "Define a non-system or stabilizing goal", "Define a thematic question"].map((item, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#a78bfa", padding: "10px 14px", borderLeft: "2px solid rgba(138,92,246,0.4)", marginBottom: "8px", background: "rgba(138,92,246,0.04)" }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* PROGRESSION */}
        {activeSection === "progression" && (
          <div style={{ paddingTop: "28px" }}>
            <SectionHeader label="6" title="Progression Structure" />
            <p style={{ fontSize: "12px", color: "#6b6890", marginBottom: "24px" }}>Each tier maps to a stage of narrative understanding.</p>
            <div style={{ position: "relative", paddingLeft: "40px" }}>
              <div style={{ position: "absolute", left: "18px", top: 0, bottom: 0, width: "1px", background: "linear-gradient(to bottom, rgba(138,92,246,0.6), rgba(56,189,248,0.2))" }} />
              {SYSTEM_STORY_DESIGN.progressionTiers.map((t, i) => {
                const prog = i / (SYSTEM_STORY_DESIGN.progressionTiers.length - 1);
                const r = Math.round(138 + (56 - 138) * prog);
   const g = Math.round(92 + (189 - 92) * prog);
                const b = Math.round(246 + (248 - 246) * prog);
                const color = `rgb(${r},${g},${b})`;
                return (
                  <div key={t.tier} style={{ position: "relative", marginBottom: "24px" }}>
                    <div style={{ position: "absolute", left: "-28px", top: "50%", transform: "translateY(-50%)", width: "10px", height: "10px", borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                    <div style={{ border: `1px solid rgba(${r},${g},${b},0.25)`, background: `rgba(${r},${g},${b},0.05)`, padding: "14px 18px", borderRadius: "3px" }}>
                      <span style={{ fontSize: "10px", color: color, letterSpacing: "2px", marginRight: "12px" }}>TIER {t.tier}</span>
                      <span style={{ fontSize: "14px", color: "#e2e0f0" }}>{t.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* DESIGN */}
        {activeSection === "design" && (
          <div style={{ paddingTop: "28px" }}>
            <SectionHeader label="5" title="Required Design Decisions" />
            <p style={{ fontSize: "12px", color: "#6b6890", marginBottom: "24px" }}>Lock these early to prevent narrative drift.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
              {SYSTEM_STORY_DESIGN.designDecisions.map((d, i) => (
                <div key={i} style={{ border: "1px solid rgba(138,92,246,0.2)", background: "rgba(138,92,246,0.04)", padding: "18px", borderRadius: "3px" }}>
                  <div style={{ fontSize: "11px", color: "#8a5cf6", letterSpacing: "3px", marginBottom: "12px", textTransform: "uppercase" }}>{d.title}</div>
                  {d.items.map((item, j) => (
                    <div key={j} style={{ fontSize: "12px", color: "#9d99b8", marginBottom: "8px", paddingLeft: "10px", borderLeft: "1px solid rgba(138,92,246,0.3)" }}>{item}</div>
                  ))}
                </div>
              ))}
            </div>
            {/* Extensions */}
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "11px", color: "#6b6890", letterSpacing: "3px", marginBottom: "14px", textTransform: "uppercase" }}>Optional Extensions</div>
              {["Multi-layer systems (system inside a system)", "Competing systems with conflicting goals", "Corrupted or decaying systems", "Systems that evolve alongside the protagonist"].map((e, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#7c78a0", padding: "8px 12px", marginBottom: "6px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(138,92,246,0.1)", borderRadius: "2px" }}>
                  ◈ {e}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* THEMES */}
        {activeSection === "themes" && (
<div style={{ paddingTop: "28px" }}>
            <SectionHeader label="9" title="Thematic Anchors" />
            <p style={{ fontSize: "12px", color: "#6b6890", marginBottom: "24px" }}>Pick one early. Let it inform every system decision.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
              {SYSTEM_STORY_DESIGN.themes.map((t, i) => {
                const [a, b] = t.split(" vs ");
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", border: "1px solid rgba(138,92,246,0.15)", background: "rgba(255,255,255,0.02)", padding: "16px 20px", borderRadius: "3px" }}>
                    <span style={{ fontSize: "14px", color: "#c4b5fd" }}>{a}</span>
                    <span style={{ fontSize: "11px", color: "rgba(138,92,246,0.5)", letterSpacing: "2px", fontStyle: "italic" }}>vs</span>
                    <span style={{ fontSize: "14px", color: "#f87171" }}>{b}</span>
                  </div>
                );
              })}
            </div>
            {/* Personal alignment */}
            <div>
              <div style={{ fontSize: "11px", color: "#6b6890", letterSpacing: "3px", marginBottom: "14px", textTransform: "uppercase" }}>Personal Alignment</div>
              <div style={{ fontSize: "12px", color: "#7c78a0", lineHeight: 1.8, border: "1px solid rgba(138,92,246,0.15)", padding: "16px 18px", borderRadius: "3px" }}>
                Prefer structured progression · Clear long-term payoff · No open-ended drift<br />
                Interested in systems, AI logic, and rule-based frameworks<br /><br />
                <span style={{ color: "#a78bfa" }}>→ Favor endings involving:</span><br />
                System truth reveals · Control/authority decisions · Logical consistency · World-state stabilization
              </div>
            </div>
          </div>
        )}
        {/* CHECKLIST */}
        {activeSection === "checklist" && (
          <div style={{ paddingTop: "28px" }}>
            <SectionHeader label="10" title="Quick Validation Checklist" />
            <p style={{ fontSize: "12px", color: "#6b6890", marginBottom: "24px" }}>Before committing to a story — if any answer is unclear, refine before writing.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
              {SYSTEM_STORY_DESIGN.checklist.map((item, i) => (
                <div key={i} onClick={() => toggleCheck(i)} style={{
                  display: "flex", alignItems: "center", gap: "14px", cursor: "pointer",
                  border: checkedItems[i] ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(138,92,246,0.15)",
                  background: checkedItems[i] ? "rgba(74,222,128,0.05)" : "rgba(255,255,255,0.02)",
                  padding: "14px 18px", borderRadius: "3px", transition: "all 0.2s",
                }}>
                  <div style={{
                    width: "18px", height: "18px", border: `1px solid ${checkedItems[i] ? "#4ade80" : "rgba(138,92,246,0.4)"}`,
                    borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, background: checkedItems[i] ? "rgba(74,222,128,0.15)" : "transparent",
                    transition: "all 0.2s",
                  }}>
                    {checkedItems[i] && <span style={{ fontSize: "12px", color: "#4ade80" }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "13px", color: checkedItems[i] ? "#4ade80" : "#9d99b8" }}>{item}</span>
                </div>
              ))}
            </div>
            {allChecked && (
              <div style={{ border: "1px solid rgba(74,222,128,0.5)", background: "rgba(74,222,128,0.08)", padding: "16px 20px", borderRadius: "3px", fontSize: "13px", color: "#4ade80", letterSpacing: "1px" }}>
                ✓ SYSTEM VALIDATED — Ready to write.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function SectionHeader({ label, title }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <span style={{ fontSize: "10px", color: "rgba(138,92,246,0.5)", letterSpacing: "3px", marginRight: "10px" }}>{label}.</span>
      <span style={{ fontSize: "18px", color: "#e2e0f0", letterSpacing: "1px" }}>{title}</span>
    </div>
  );
}