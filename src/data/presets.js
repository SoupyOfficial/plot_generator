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
      protagonistOrigin: "Regression — woken up earlier in own timeline",
      storyEngine: "Regression / time loop",
      knowledgeAdvantage: "Future knowledge (time travel)",
      protagonistLifeStage: "Threshold Adult (20–25)",
      comingOfAgeAxis:
        "Reckoning with prior self (regression / post-burnout / post-divorce)",
    },
  },
  {
    id: "academy-coming-of-age",
    label: "Academy coming-of-age",
    description:
      "Teen protagonist enters a magical academy; year-by-year structure; first-competence engine. Mother of Learning, Arcane Ascension, Wandering Inn (academy arcs).",
    selections: {
      subgenre: "Magical academy",
      integrationType: "Native world (system always existed)",
      worldScale: "Single planet",
      techLevel: "Pre-modern",
      systemVisibility: "Partial (some elements visible)",
      systemAlignment: "Neutral / indifferent",
      archetype: "The Investigator — driven to understand why",
      protagonistOrigin: "Native — born in this world",
      protagonistLifeStage: "Adolescent / Coming-of-Age (13–19)",
      comingOfAgeAxis: "First competence — am I capable?",
      maturityModel: "Earned (slow, costed)",
      storyEngine: "Academy arc (year-by-year)",
      progressionRungs: "Academy — year-based (Freshman → Senior → Graduate)",
      primaryTheme: "Belonging vs Exceptionalism",
      protagonistClass: "Mage / Elementalist",
      relationalAnchor: "Master ↔ disciple bond",
      bodyAndMortality: "Youthful invulnerability (default genre baseline)",
    },
  },
  {
    id: "burnout-isekai",
    label: "Burnout isekai (25+)",
    description:
      "Late-twenties protagonist hits a wall — career, relationship, or health collapse — and the system arrives as a forced second chance. DCC's Carl, Beware of Chicken's Jin, Ascendance of a Bookworm.",
    selections: {
      subgenre: "System apocalypse",
      integrationType: "Portal fantasy (transported)",
      worldScale: "Single planet",
      techLevel: "Modern real world",
      systemVisibility: "Full UI (stat screens, notifications)",
      systemAlignment: "Neutral / indifferent",
      archetype: "The Accidental — dragged in unwillingly",
      protagonistOrigin: "Isekai — transported with own body",
      protagonistLifeStage: "Quarter-Life Reckoning (25–32)",
      comingOfAgeAxis:
        "Reckoning with prior self (regression / post-burnout / post-divorce)",
      maturityModel: "Forced (trauma-driven)",
      storyEngine: "Wave defense / integration apocalypse",
      primaryTheme: "Legacy vs Reinvention",
      secondaryTheme: "Found Family vs Isolation",
      protagonistClass: "Classless / off-script",
      relationalAnchor: "Found family / chosen circle",
      bodyAndMortality: "Aging body (decline meets new power)",
    },
  },
  {
    id: "dad-system",
    label: "Dad gets a system (mid-life)",
    description:
      "Mid-life protagonist with kids / spouse / mortgage gets a system. Stakes are domestic and cosmic. Decline-meets-new-power. The 'parent isekai' wave.",
    selections: {
      subgenre: "System apocalypse",
      integrationType: "System apocalypse (Earth gets a system)",
      worldScale: "Single planet",
      techLevel: "Modern real world",
      systemVisibility: "Full UI (stat screens, notifications)",
      systemAlignment: "Evolving alongside protagonist",
      archetype: "The Builder — uses power to construct",
      protagonistOrigin: "Awakened — latent native, triggered later",
      protagonistLifeStage: "Mid-Life Reforging (33–45)",
      comingOfAgeAxis: "Parenthood as transformation",
      maturityModel: "Earned (slow, costed)",
      storyEngine: "Base / settlement building",
      primaryTheme: "Duty vs Desire",
      secondaryTheme: "Found Family vs Isolation",
      protagonistClass: "Crafter / Artificer",
      relationalAnchor: "Dependent child (theirs or adopted)",
      bodyAndMortality: "Aging body (decline meets new power)",
    },
  },
  {
    id: "retired-hero",
    label: "Retired hero, second life",
    description:
      "A late-career or elder protagonist comes out of retirement (or never wanted to). Mentorship, succession, and reckoning with one's younger self. Legends & Lattes, retired-soldier-reborn.",
    selections: {
      subgenre: "Cozy LitRPG / low-stakes",
      integrationType: "Native world (system always existed)",
      techLevel: "Pre-modern",
      systemVisibility: "Partial (some elements visible)",
      systemAlignment: "Actively helpful",
      archetype: "The Builder — uses power to construct",
      protagonistOrigin: "Native — born in this world",
      protagonistLifeStage: "Late-Career Pivot (45–60)",
      comingOfAgeAxis: "Authority transfer — taking the mantle",
      maturityModel: "Earned (slow, costed)",
      storyEngine: "Slice-of-life drift",
      primaryTheme: "Legacy vs Reinvention",
      secondaryTheme: "Tradition vs Innovation",
      protagonistClass: "Warrior / Berserker",
      relationalAnchor: "Community / village / settlement",
      bodyAndMortality: "Aging body (decline meets new power)",
    },
  },
  {
    id: "generational-saga",
    label: "Generational saga",
    description:
      "POV spans decades or shifts across life stages. Time-skips as structure; identity examined across ages. Beware of Chicken (family arcs), dynastic xianxia.",
    selections: {
      subgenre: "Classical progression fantasy (cultivation / ranks)",
      integrationType: "Native world (system always existed)",
      worldScale: "Multiverse / realms",
      techLevel: "Pre-modern",
      systemVisibility: "Hidden (felt but not seen)",
      systemAlignment: "Neutral / indifferent",
      protagonistOrigin: "Native — born in this world",
      protagonistLifeStage: "Generational (POV spans decades / multiple stages)",
      comingOfAgeAxis: "Mortality acceptance — what do I leave behind?",
      maturityModel: "Earned (slow, costed)",
      storyEngine: "Hybrid (multiple engines layered)",
      primaryTheme: "Inheritance vs Self-Authorship",
      secondaryTheme: "Tradition vs Innovation",
    },
  },
];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}
