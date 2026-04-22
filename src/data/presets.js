// src/data/presets.js
//
// Starter presets: each seeds a handful of "anchor" fields that define the
// subgenre's vibe. The user still fills in remaining fields themselves.
//
// IMPORTANT: option values MUST match the exact strings in LAYERS (App.jsx),
// or applyPreset will silently set invalid values. Tests validate this.

export const PRESETS = [
  {
    id: "blank",
    label: "Blank slate",
    description: "Start fresh with no preselections.",
    selections: {},
  },
  {
    id: "cradle-like",
    label: "Classical progression fantasy",
    description:
      "Native cultivation/ranked world, secretive system, protagonist climbs the ladder. Cradle, Beware of Chicken, A Practical Guide to Sorcery.",
    selections: {
      subgenre: "Classical progression fantasy (cultivation / ranks)",
      integrationType: "Native world (system always existed)",
      worldScale: "Multiverse / realms",
      techLevel: "Pre-modern",
      systemVisibility: "Partial (some elements visible)",
      systemAlignment: "Neutral / indifferent",
      archetype: "The Builder — uses power to construct",
      progressionRungs: "Cultivation — 9 named realms",
    },
  },
  {
    id: "dcc-apocalypse",
    label: "System apocalypse / dark comedy",
    description:
      "Earth gets a system, it's hostile and theatrical, protagonist survives. Dungeon Crawler Carl, He Who Fights With Monsters.",
    selections: {
      subgenre: "System apocalypse",
      integrationType: "System apocalypse (Earth gets a system)",
      worldScale: "Single planet",
      techLevel: "Modern real world",
      systemVisibility: "Full UI (stat screens, notifications)",
      systemAlignment: "Openly adversarial",
      archetype: "The Accidental — dragged in unwillingly",
      progressionRungs: "LitRPG — numeric levels (1–100)",
    },
  },
  {
    id: "cozy-litrpg",
    label: "Cozy LitRPG",
    description:
      "Portal to a friendly world, helpful system, low-stakes building and crafting. Beware of Chicken (cozy arc), Travis Baldree's Legends & Lattes vibe.",
    selections: {
      subgenre: "Cozy LitRPG / low-stakes",
      integrationType: "Portal fantasy (transported)",
      techLevel: "Pre-modern",
      systemVisibility: "Full UI (stat screens, notifications)",
      systemAlignment: "Actively helpful",
      archetype: "The Builder — uses power to construct",
    },
  },
  {
    id: "regression",
    label: "Regression / time-loop",
    description:
      "Protagonist has foreknowledge of a prior run. Mother of Learning, Re:Zero, many Korean webnovels.",
    selections: {
      subgenre: "Regression / time loop",
      systemVisibility: "Partial (some elements visible)",
      archetype: "The Returner — has foreknowledge",
    },
  },
];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}
