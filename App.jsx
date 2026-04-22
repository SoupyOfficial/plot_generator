import { useState, useMemo, useEffect, useRef } from "react";
import { SYSTEM_STORY_DESIGN } from "./system_story_data";
import {
  normalizeOption,
  optionValue,
  buildFieldIndex,
  conflictsForOption,
} from "./src/lib/options.js";
import { validateSelections } from "./src/lib/validation.js";
import { buildGenerationPrompt } from "./src/lib/prompt.js";

const SYSTEM_PURPOSE_OPTIONS = SYSTEM_STORY_DESIGN.archetypes.map(
  (a) => `${a.label} — ${a.goal}`
);

const RESOLUTION_MODE_OPTIONS = Array.from(
  new Set([
    ...SYSTEM_STORY_DESIGN.resolutionModes.map((r) => `${r.label} (${r.desc})`),
    "Destruction (system ends)",
  ])
);

// ============================================================================
// COMPONENT DATA — extracted from story_anatomy + system_story_design.js + system_story_design.pdf
// ============================================================================

const LAYERS = [
  {
    id: "macro",
    num: 1,
    title: "Macro Structure",
    subtitle: "The bones. One selection per component.",
    groups: [
      {
        id: "world",
        title: "1.1 World / Setting",
        components: [
          {
            id: "integrationType",
            label: "Integration Type",
            options: [
              "System apocalypse (Earth gets a system)",
              "Portal fantasy (transported)",
              "Virtual reality (VR/game trapped)",
              "Native world (system always existed)",
              "Hybrid (Earth + portal)",
            ],
          },
          {
            id: "worldScale",
            label: "World Scale",
            options: ["Single planet", "Multiverse / realms", "Dungeon-only", "City-state", "Galactic"],
          },
          {
            id: "techLevel",
            label: "Technology Level",
            options: [
              "Pre-modern",
              "Modern real world",
              "Near-future",
              "Sci-fi / post-human",
              "Mixed (magic + tech)",
            ],
          },
        ],
      },
      {
        id: "system",
        title: "1.2 System Structure",
        components: [
          {
            id: "systemVisibility",
            label: "System Visibility",
            options: [
              "Full UI (stat screens, notifications)",
              "Partial (some elements visible)",
              "Hidden (felt but not seen)",
              "Contested (protagonist questions it)",
            ],
          },
          {
            id: "systemOrigin",
            label: "System Origin",
            options: [
              "Unknown / mysterious",
              "Divine / god-created",
              "Alien intelligence",
              "Human-built gone rogue",
              "Natural evolution of reality",
              "Collapsed civilization remnant",
            ],
          },
          {
            id: "systemPurpose",
            label: "System Purpose (hidden archetype)",
            options: SYSTEM_PURPOSE_OPTIONS.map((v) => {
              // Entertainment archetype forbids Defier: audience wants constrain every decision
              if (/entertainment/i.test(v)) {
                return {
                  value: v,
                  description:
                    "Audience desire is the invisible constraint on every protagonist choice.",
                  tags: ["audience-pressure", "visible-constraint"],
                  forbids: { archetype: "The Defier" },
                };
              }
              return v;
            }),
          },
          {
            id: "systemAlignment",
            label: "System Alignment",
            options: [
              "Neutral / indifferent",
              "Actively helpful",
              "Passively hostile",
              "Deceptively benevolent",
              "Openly adversarial",
              "Evolving alongside protagonist",
            ],
          },
          {
            id: "systemCeiling",
            label: "System Ceiling",
            options: [
              "Hard cap (defined max level/tier)",
              "Soft cap (diminishing returns)",
              "No visible ceiling",
              "Hidden ceiling revealed late",
            ],
          },
        ],
      },
      {
        id: "entry",
        title: "1.3 Protagonist Entry Point",
        components: [
          {
            id: "entryCondition",
            label: "Entry Condition",
            options: [
              "Random selection",
              "Chosen / prophesied",
              "Accident / wrong place",
              "Earned / applied",
              "Reincarnation / time reset",
              "Born into it",
              "Forced / trapped",
            ],
          },
          {
            id: "startingState",
            label: "Starting State",
            options: [
              "Weakest possible (underdog)",
              "Average",
              "Hidden overpowered",
              "Already powerful",
              "Formerly powerful / reset",
              "Disabled / restricted",
            ],
          },
          {
            id: "knowledgeAdvantage",
            label: "Knowledge Advantage",
            options: [
              "None (blank slate)",
              "Future knowledge (time travel)",
              "Meta knowledge (knows it's a game)",
              "Partial insider info",
              "Expert in adjacent field",
            ],
          },
        ],
      },
      {
        id: "conflict",
        title: "1.4 Core Conflict",
        components: [
          {
            id: "primaryConflict",
            label: "Primary Conflict",
            options: [
              "Protagonist vs system",
              "Protagonist vs external threat",
              "Protagonist vs faction/society",
              "Protagonist vs self",
              "Protagonist vs another chosen",
              "Protagonist vs system's creator",
            ],
          },
          {
            id: "conflictOrigin",
            label: "Conflict Origin",
            options: [
              "Imposed by system",
              "Personal vendetta",
              "Ideological",
              "Survival",
              "Protection of others",
              "Curiosity / discovery",
            ],
          },
        ],
      },
      {
        id: "ending",
        title: "1.5 Terminal Ending (LOCK BEFORE WRITING)",
        components: [
          {
            id: "resolutionMode",
            label: "Resolution Mode",
            options: RESOLUTION_MODE_OPTIONS.map((v) => {
              if (/exposure/i.test(v)) {
                return {
                  value: v,
                  description:
                    "Truth about the system is the climax. Requires early breadcrumbs — incompatible with 'Single late reveal' pacing.",
                  tags: ["mystery", "requires-breadcrumbs"],
                  forbids: { truthRevealPacing: "Single late reveal" },
                };
              }
              return v;
            }),
          },
          {
            id: "protagonistOutcome",
            label: "Protagonist Outcome",
            options: [
              "Transcendence (becomes something new)",
              "Return (back to ordinary)",
              "Sacrifice",
              "Apotheosis (becomes part of system)",
              "Rejection (walks away)",
              "Coexistence",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "mid",
    num: 2,
    title: "Mid Structure",
    subtitle: "The meat. Shapes texture across the full length.",
    groups: [
      {
        id: "progression",
        title: "2.1 Power Progression",
        components: [
          {
            id: "progressionMechanic",
            label: "Progression Mechanic",
            options: [
              "Level / XP grinding",
              "Cultivation tiers (named ranks)",
              "Skill tree unlocks",
              "Stat allocation",
              "Class evolution",
              "Bloodline / inheritance",
              "Crafting / creation",
              "Insight / epiphany",
              "Hybrid",
            ],
          },
          {
            id: "progressionPacing",
            label: "Progression Pacing",
            options: [
              "Rapid early / slow late",
              "Slow and earned throughout",
              "Explosive breakthroughs",
              "Plateau and burst",
              "Continuous steady climb",
            ],
          },
          {
            id: "powerCeilingFeel",
            label: "Power Ceiling Feel",
            options: [
              "Infinite (always more to gain)",
              "Bounded (visible finish line)",
              "Asymptotic (approaches but never reaches)",
              "Tier-gated (hard walls between stages)",
            ],
          },
          {
            id: "powerExpression",
            label: "Power Expression",
            options: [
              "Combat-dominant",
              "Crafting / utility",
              "Political / social",
              "Knowledge / information",
              "Creation / building",
              "Hybrid",
            ],
          },
        ],
      },
      {
        id: "antagonist",
        title: "2.2 Antagonist",
        components: [
          {
            id: "antagonistType",
            label: "Primary Antagonist Type",
            options: [
              "The system itself",
              "A rival chosen",
              "Faction / organization",
              "Ancient/cosmic entity",
              "Former mentor",
              "Protagonist's past self",
              "Corrupt authority",
              "Hidden observer",
            ],
          },
          {
            id: "antagonistMotivation",
            label: "Antagonist Motivation",
            options: [
              "Ideological (believes they're right)",
              "Self-preservation",
              "Power accumulation",
              "Revenge",
              "Devotion to system",
              "Fear of protagonist",
              "Competing for same goal",
            ],
          },
          {
            id: "antagonistReveal",
            label: "Antagonist Reveal Timing",
            options: [
              "Known from start",
              "Gradual reveal",
              "Late twist",
              "Multiple antagonists",
              "No single antagonist (systemic)",
            ],
          },
        ],
      },
      {
        id: "factions",
        title: "2.3 Faction / World",
        components: [
          {
            id: "factionLandscape",
            label: "Faction Landscape",
            options: [
              "Single dominant power",
              "Two opposing sides",
              "Multi-faction balance",
              "Hierarchy of powers (tiers/realms)",
              "No factions (individual survival)",
            ],
          },
          {
            id: "factionRole",
            label: "Protagonist's Faction Role",
            options: [
              "Lone wolf",
              "Reluctant member",
              "Hidden agent",
              "Leader / builder",
              "Faction hopper",
              "Creates own faction",
            ],
          },
          {
            id: "politicalTexture",
            label: "Political Texture",
            options: [
              "Minimal (action-focused)",
              "Moderate (alliances matter)",
              "Heavy (court intrigue)",
              "Systemic (factions ARE the conflict)",
            ],
          },
        ],
      },
      {
        id: "stakes",
        title: "2.4 Stakes Escalation",
        components: [
          {
            id: "escalationType",
            label: "Escalation Type",
            options: [
              "Personal → regional → global → cosmic",
              "Slow burn with single explosion",
              "Multiple escalations with resets",
              "Stakes introduced late",
              "Constant high stakes",
            ],
          },
          {
            id: "costOfPower",
            label: "Cost of Power",
            options: [
              "None (pure wish fulfillment)",
              "Physical cost",
              "Moral cost",
              "Relationship cost",
              "Identity cost",
              "All of the above",
            ],
          },
        ],
      },
      {
        id: "revelation",
        title: "2.5 System Revelation",
        components: [
          {
            id: "truthRevealPacing",
            label: "Truth Reveal Pacing",
            options: [
              {
                value: "Drip (one piece per arc)",
                description: "Steady escalation of revelation.",
                tags: ["mystery-friendly"],
              },
              {
                value: "Two-stage (partial early / full late)",
                description: "Reader learns shape early, full truth late.",
                tags: ["mystery-friendly"],
              },
              {
                value: "Single late reveal",
                description:
                  "One big reveal at the end. This is a TWIST, not a resolution — cannot pair with an Exposure ending.",
                tags: ["twist"],
                forbids: { resolutionMode: "Exposure" },
              },
              "Protagonist discovers vs told",
              "Red herrings before truth",
            ],
          },
          {
            id: "revelationTrigger",
            label: "Revelation Trigger",
            options: [
              "Protagonist earns it",
              "Antagonist exposes it",
              "Accident / wrong place",
              "System reveals itself",
              "Third party reveals",
            ],
          },
          {
            id: "truthImpact",
            label: "Truth Impact on Protagonist",
            options: [
              "Validates their path",
              "Shatters worldview",
              "Forces choice",
              "Changes nothing (they adapt)",
              "Motivates final confrontation",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "subplots",
    num: 3,
    title: "Subplot Structure",
    subtitle: "Pick 2–4 subplots. Each should have its own beginning, middle, end.",
    multiSelect: true,
    groups: [
      {
        id: "subplotPicks",
        title: "3.x Subplot Selections (multi-select, pick 2–4)",
        components: [
          {
            id: "subplots",
            label: "Subplots",
            multi: true,
            min: 2,
            max: 4,
            options: [
              "Mentor: Genuine guide",
              "Mentor: Hidden agenda",
              "Mentor: Betrayal",
              "Mentor: Dies to motivate",
              "Rival: Same goal, different method",
              "Rival: Former ally",
              "Rival: Mirror character",
              "Companion: Found family",
              "Companion: Assigned team",
              "Romance: Slow burn",
              "Romance: Forbidden",
              "Romance: Absent by choice",
              "Family as motivation",
              "Family secret ties to system",
              "Political intrigue: Faction war",
              "Political intrigue: Power vacuum",
              "Mystery: System origin investigation",
              "Mystery: Hidden history of the world",
              "World-building: Settlement / city building",
              "World-building: Other chosen / competitors",
              "Economic: Crafting empire",
              "Economic: Information as currency",
              "Identity crisis: Power changing who protagonist is",
              "Identity crisis: Loss of humanity",
              "Moral dilemma: Ends vs means",
              "Moral dilemma: System rewards evil",
              "Secret: Protagonist hiding ability",
              "Secret: True identity",
              "Obsession: Revenge driving irrational decisions",
              "Obsession: Protecting one person above all",
              "Investigation: What does the system actually want",
              "Conspiracy: System has a secret controller",
              "Conspiracy: The tutorial was a trap",
              "Countdown: System event approaching",
              "Countdown: Resource about to run out",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "protagonist",
    num: 4,
    title: "Protagonist Archetype",
    subtitle: "The lens. Structural role in relation to the system.",
    groups: [
      {
        id: "archetype",
        title: "4.1 Relationship to the System",
        components: [
          {
            id: "archetype",
            label: "Archetype",
            options: [
              {
                value: "The Exploiter — games the system as a tool",
                description:
                  "Treats the system as an optimization problem; wins by extracting value.",
                tags: ["pragmatic", "tool-user"],
              },
              {
                value: "The Investigator — driven to understand why",
                description: "The central mystery IS the system's real purpose.",
                tags: ["mystery", "cerebral"],
              },
              {
                value: "The Defier — resists or subverts system intent",
                description:
                  "Autonomy is the thesis. Cannot coexist with Entertainment-purpose systems (audience pressure overrides defiance).",
                tags: ["autonomous", "anti-system"],
              },
              {
                value: "The True Believer — aligned, then shattered",
                description: "Earns trust in the system, then discovers the lie.",
                tags: ["faith-break"],
              },
              {
                value: "The Returner — has foreknowledge",
                description:
                  "Knows how things 'should' go. Foreknowledge MUST compound into rivals, mystery, or red herrings — else the premise stalls.",
                tags: ["foreknowledge", "compounding-required"],
                requires: {
                  knowledgeAdvantage: ["Future knowledge", "Meta knowledge"],
                },
              },
              {
                value: "The Builder — uses power to construct",
                description: "Creates factions, crafting empires, or settlements.",
                tags: ["constructive"],
              },
              {
                value: "The Accidental — dragged in unwillingly",
                description: "Reluctant everyman; humanity-first lens.",
                tags: ["reluctant"],
              },
            ],
          },
        ],
      },
      {
        id: "flaw",
        title: "4.2 Core Flaw (required)",
        components: [
          {
            id: "flawType",
            label: "Flaw Type",
            options: [
              "Arrogance",
              "Isolation",
              "Recklessness",
              "Obsession",
              "Trust issues",
              "Moral rigidity",
              "Fear of intimacy",
              "Overprotectiveness",
              "Nihilism",
            ],
          },
          {
            id: "flawArc",
            label: "Flaw Arc",
            options: [
              "Overcomes it",
              "Learns to manage it",
              "It costs them something major",
              "It becomes a strength in context",
              "Never fully resolves (realistic)",
            ],
          },
        ],
      },
      {
        id: "competency",
        title: "4.3 Competency Style",
        components: [
          {
            id: "howTheyWin",
            label: "How They Win",
            options: [
              "Outfights",
              "Outthinks",
              "Outlasts",
              "Out-networks (allies)",
              "Out-crafts",
              "Gets lucky consistently",
              "Breaks the rules",
            ],
          },
          {
            id: "competencyReveal",
            label: "Competency Reveal Pacing",
            options: [
              "Shown immediately",
              "Hidden and revealed dramatically",
              "Grows visibly over time",
              "Underestimated by everyone",
              "Overestimated by protagonist",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "beats",
    num: 5,
    title: "Beat Structure",
    subtitle: "Save the Cat (15 beats). Generated from your selections by Claude.",
    informational: true,
    groups: [],
  },
  {
    id: "micro",
    num: 6,
    title: "Micro Texture",
    subtitle: "The seasoning. Shapes feel and voice.",
    groups: [
      {
        id: "tone",
        title: "6.1 Tone",
        components: [
          {
            id: "primaryTone",
            label: "Primary Tone",
            options: [
              "Grim / serious",
              "Comedic",
              "Cerebral / puzzle-focused",
              "Action-dominant",
              "Horror undertone",
              "Hopeful despite darkness",
              "Cynical",
            ],
          },
          {
            id: "toneConsistency",
            label: "Tone Consistency",
            options: [
              "Constant throughout",
              "Shifts per arc",
              "Contrast used deliberately",
              "Evolves with protagonist",
            ],
          },
        ],
      },
      {
        id: "pacing",
        title: "6.2 Pacing Rhythm",
        components: [
          {
            id: "chapterStructure",
            label: "Chapter Structure",
            options: [
              "Single POV",
              "Multiple POV alternating",
              "Dual timeline",
              "Retrospective narration",
              "Real-time only",
            ],
          },
          {
            id: "actionRestRatio",
            label: "Action / Rest Ratio",
            options: [
              "Constant action",
              "Action-recovery cycles",
              "Long quiet arcs punctuated by violence",
              "Mostly tension with rare action",
            ],
          },
          {
            id: "infoRelease",
            label: "Information Release",
            options: [
              "Front-loaded (reader knows more)",
              "Drip-fed (discover together)",
              "Delayed (protagonist knows, reader doesn't)",
              "Mystery box (neither knows)",
            ],
          },
        ],
      },
      {
        id: "hooks",
        title: "6.4 Chapter Hooks",
        components: [
          {
            id: "hookType",
            label: "Dominant Hook Type",
            options: [
              "Cliffhanger",
              "Revelation",
              "Emotional",
              "Question",
              "Callback",
              "Irony",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "series",
    num: 7,
    title: "Series Architecture",
    subtitle: "For multi-book plans. Define before book one.",
    groups: [
      {
        id: "seriesType",
        title: "7.1 Series Structure",
        components: [
          {
            id: "arcType",
            label: "Arc Type",
            options: [
              "Each book = self-contained story",
              "Each book = one phase of larger arc",
              "Continuous narrative (no book-level resolution)",
              "Anthology (same world, different characters)",
              "Single book (standalone)",
            ],
          },
          {
            id: "seriesCeiling",
            label: "Series Ceiling",
            options: [
              "Defined (X books total)",
              "Open-ended with defined ending",
              "Open-ended with thematic endpoint",
              "No planned ending",
            ],
          },
        ],
      },
      {
        id: "antidrift",
        title: "7.3 Anti-Drift Mechanisms (pick at least 2 if open-ended)",
        components: [
          {
            id: "antiDrift",
            label: "Structural Locks",
            multi: true,
            min: 1,
            max: 4,
            options: [
              "Hard system ceiling defined",
              "Non-system stabilizing goal",
              "Thematic question that must be answered",
              "External deadline (event, threat, timer)",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "theme",
    num: 8,
    title: "Thematic Anchors",
    subtitle: "The soul. Primary theme framed as a yes/no question.",
    groups: [
      {
        id: "themePick",
        title: "8.1 Primary Theme",
        components: [
          {
            id: "primaryTheme",
            label: "Primary Theme",
            options: [
              "Power vs Humanity",
              "Control vs Freedom",
              "Survival vs Morality",
              "Progress vs Identity",
              "Knowledge vs Consequence",
              "Individual vs Collective",
              "Truth vs Comfort",
            ],
          },
          {
            id: "secondaryTheme",
            label: "Secondary Theme",
            options: [
              "Power vs Humanity",
              "Control vs Freedom",
              "Survival vs Morality",
              "Progress vs Identity",
              "Knowledge vs Consequence",
              "Individual vs Collective",
              "Truth vs Comfort",
              "None",
            ],
          },
        ],
      },
    ],
  },
];

// ============================================================================
// COMPATIBILITY RULES — from "COMPATIBILITY RULES" section of story_anatomy.docx
// Real implementation lives in src/lib/validation.js (hybrid: data-driven
// `forbids` on option objects + cross-cutting multi-field rules).
// ============================================================================

function validate(s) {
  return validateSelections(s, LAYERS);
}

// ============================================================================
// LLM API CALLS (Anthropic + OpenAI via API key auto-detection)
// ============================================================================

function detectProviderFromApiKey(apiKey) {
  const key = (apiKey || "").trim();
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("sk-proj-") || key.startsWith("sk-")) return "openai";
  return null;
}

// `buildGenerationPrompt` now lives in src/lib/prompt.js. We build a per-call
// context object so we can pass selections + warnings + user notes together.
function buildPromptContext(selections, activeWarnings, userNotes) {
  return buildGenerationPrompt({
    layers: LAYERS,
    selections,
    systemDesign: SYSTEM_STORY_DESIGN,
    activeWarnings,
    userNotes,
  });
}

function parseStructuredJson(text) {
  const cleaned = (text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callAnthropic(apiKey, selections, extra = {}) {
  const { system, user } = buildPromptContext(
    selections,
    extra.activeWarnings,
    extra.userNotes
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return parseStructuredJson(text);
}

async function callOpenAI(apiKey, selections, extra = {}) {
  const { system, user } = buildPromptContext(
    selections,
    extra.activeWarnings,
    extra.userNotes
  );

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return parseStructuredJson(text);
}

async function callModel(apiKey, selections, extra = {}) {
  const provider = detectProviderFromApiKey(apiKey);

  if (provider === "anthropic") {
    return callAnthropic(apiKey, selections, extra);
  }
  if (provider === "openai") {
    return callOpenAI(apiKey, selections, extra);
  }

  throw new Error("Unknown API key format. Use an Anthropic key (sk-ant-...) or OpenAI key (sk-... / sk-proj-...).");
}

// ============================================================================
// STYLES
// ============================================================================

const COLOR = {
  bg: "#0a0a0f",
  panel: "rgba(255,255,255,0.02)",
  text: "#e2e0f0",
  muted: "#7c78a0",
  dim: "#6b6890",
  purple: "#8a5cf6",
  purpleSoft: "#a78bfa",
  purpleLight: "#c4b5fd",
  border: "rgba(138,92,246,0.25)",
  borderStrong: "rgba(138,92,246,0.6)",
  red: "#f87171",
  redBorder: "rgba(248,113,113,0.5)",
  redBg: "rgba(248,113,113,0.08)",
  green: "#4ade80",
  greenBorder: "rgba(74,222,128,0.5)",
  greenBg: "rgba(74,222,128,0.08)",
  cyan: "#38bdf8",
};

const FONT = "'Courier New', Courier, monospace";
const LAST_SELECTION_ENDPOINT = "/api/last-selection";
const DEFAULT_API_KEY_ENDPOINT = "/api/default-api-key";
const SELECTION_HISTORY_ENDPOINT = "/api/selection-history";

const S = {
  root: {
    minHeight: "100vh",
    background: COLOR.bg,
    color: COLOR.text,
    fontFamily: FONT,
    position: "relative",
    overflowX: "hidden",
  },
  grid: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    backgroundImage:
      "linear-gradient(rgba(138,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(138,92,246,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  orb1: {
    position: "fixed",
    top: "-120px",
    left: "20%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(138,92,246,0.15), transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  orb2: {
    position: "fixed",
    bottom: "-80px",
    right: "10%",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "960px",
    margin: "0 auto",
    padding: "0 24px 96px",
  },
  header: {
    padding: "48px 0 32px",
    borderBottom: `1px solid ${COLOR.border}`,
  },
  eyebrow: {
    fontSize: "10px",
    letterSpacing: "4px",
    color: COLOR.purple,
    marginBottom: "10px",
  },
  h1: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 36px)",
    fontWeight: 400,
    letterSpacing: "2px",
    lineHeight: 1.3,
  },
  subtitle: {
    marginTop: "16px",
    fontSize: "13px",
    color: COLOR.muted,
    lineHeight: 1.7,
  },
  layerCard: {
    marginTop: "16px",
    border: `1px solid ${COLOR.border}`,
    background: COLOR.panel,
    borderRadius: "3px",
    overflow: "hidden",
  },
  layerHeader: {
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    userSelect: "none",
    background: "rgba(138,92,246,0.04)",
  },
  layerNum: {
    fontSize: "10px",
    letterSpacing: "3px",
    color: COLOR.purple,
    minWidth: "60px",
  },
  layerTitle: {
    fontSize: "15px",
    color: COLOR.text,
    letterSpacing: "1px",
    flex: 1,
  },
  layerSubtitle: {
    fontSize: "11px",
    color: COLOR.dim,
    marginTop: "4px",
  },
  layerBody: {
    padding: "20px",
    borderTop: `1px solid ${COLOR.border}`,
  },
  groupTitle: {
    fontSize: "11px",
    color: COLOR.dim,
    letterSpacing: "3px",
    textTransform: "uppercase",
    marginTop: "18px",
    marginBottom: "10px",
  },
  fieldLabel: {
    display: "block",
    fontSize: "11px",
    color: COLOR.purpleSoft,
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "6px",
    marginTop: "12px",
  },
  select: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "13px",
    borderRadius: "2px",
    outline: "none",
  },
  multiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "6px",
  },
  chip: (on) => ({
    padding: "8px 12px",
    fontSize: "12px",
    border: `1px solid ${on ? COLOR.borderStrong : COLOR.border}`,
    background: on ? "rgba(138,92,246,0.15)" : "rgba(0,0,0,0.25)",
    color: on ? COLOR.purpleLight : COLOR.muted,
    cursor: "pointer",
    borderRadius: "2px",
    fontFamily: FONT,
    textAlign: "left",
    transition: "all 0.15s",
  }),
  warnBox: {
    marginTop: "24px",
    border: `1px solid ${COLOR.redBorder}`,
    background: COLOR.redBg,
    padding: "16px 18px",
    borderRadius: "3px",
  },
  warnTitle: {
    fontSize: "11px",
    color: COLOR.red,
    letterSpacing: "3px",
    marginBottom: "10px",
  },
  warnItem: {
    fontSize: "12px",
    color: "#fca5a5",
    lineHeight: 1.6,
    marginBottom: "8px",
  },
  generateBtn: (disabled) => ({
    marginTop: "24px",
    width: "100%",
    padding: "16px",
    background: disabled ? "rgba(138,92,246,0.1)" : "rgba(138,92,246,0.2)",
    border: `1px solid ${disabled ? COLOR.border : COLOR.borderStrong}`,
    color: disabled ? COLOR.dim : COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "13px",
    letterSpacing: "4px",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: "2px",
  }),
  actionRow: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "stretch",
  },
  utilityBtn: {
    padding: "12px 16px",
    background: "rgba(0,0,0,0.35)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "12px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: "2px",
    minWidth: "240px",
  },
  statusLine: {
    marginTop: "10px",
    fontSize: "11px",
    color: COLOR.dim,
    letterSpacing: "1px",
  },
  historyRow: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "stretch",
  },
  historySelect: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
  },
  restoreBtn: {
    padding: "10px 14px",
    background: "rgba(138,92,246,0.15)",
    border: `1px solid ${COLOR.borderStrong}`,
    color: COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: "2px",
    minWidth: "220px",
  },
  output: {
    marginTop: "28px",
    border: `1px solid ${COLOR.border}`,
    background: "rgba(0,0,0,0.4)",
    padding: "24px",
    borderRadius: "3px",
    position: "relative",
  },
  copyBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(138,92,246,0.15)",
    border: `1px solid ${COLOR.borderStrong}`,
    color: COLOR.purpleLight,
    fontFamily: FONT,
    fontSize: "10px",
    letterSpacing: "2px",
    padding: "6px 10px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  apiKeyRow: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  apiKeyInput: {
    flex: 1,
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "8px 10px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
  },
  notesTextarea: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
    padding: "10px 12px",
    fontFamily: FONT,
    fontSize: "12px",
    borderRadius: "2px",
    outline: "none",
    minHeight: "90px",
    resize: "vertical",
    boxSizing: "border-box",
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function Field({ comp, value, onChange, fieldIndex, selections }) {
  // Normalize mixed string|object options up front so the rest of this
  // component doesn't care which form the data was declared in.
  const normalized = (comp.options || [])
    .map(normalizeOption)
    .filter(Boolean);

  // Compute per-option conflict state against current selections. If non-empty,
  // the option is rendered as disabled with a tooltip explaining the conflict.
  const conflictMap = new Map();
  for (const opt of normalized) {
    const conflicts = fieldIndex
      ? conflictsForOption(fieldIndex, selections || {}, comp.id, opt)
      : [];
    conflictMap.set(opt.value, conflicts);
  }

  const conflictTooltip = (conflicts) =>
    conflicts
      .map(
        (c) =>
          `Incompatible with ${c.otherField} = "${c.currentValue}"`
      )
      .join(" • ");

  if (comp.multi) {
    const set = new Set(value || []);
    return (
      <div>
        <label style={S.fieldLabel}>
          {comp.label} <span style={{ color: COLOR.dim }}>({set.size} selected{comp.min ? `, min ${comp.min}` : ""}{comp.max ? `, max ${comp.max}` : ""})</span>
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
                title={
                  disabled
                    ? conflictTooltip(conflicts)
                    : o.description || undefined
                }
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
  // Single-select: keep <select> UI. Forbidden options are `disabled` attribute.
  const currentOpt = normalized.find((o) => o.value === value);
  return (
    <div>
      <label style={S.fieldLabel} title={currentOpt?.description || undefined}>
        {comp.label}
        {currentOpt?.description && (
          <span style={{ marginLeft: 8, color: COLOR.dim, textTransform: "none", letterSpacing: 0 }}>
            — {currentOpt.description}
          </span>
        )}
      </label>
      <select
        style={S.select}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {normalized.map((o) => {
          const conflicts = conflictMap.get(o.value) || [];
          const disabled = o.value !== value && conflicts.length > 0;
          return (
            <option
              key={o.value}
              value={o.value}
              disabled={disabled}
              title={
                disabled
                  ? conflictTooltip(conflicts)
                  : o.description || undefined
              }
            >
              {disabled ? "⊘ " : ""}{o.value}
              {disabled ? "  (conflicts)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function Layer({ layer, selections, setSelection, open, onToggle, fieldIndex }) {
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
              The beat structure (Opening Image → Final Image) is synthesized automatically
              from your selections across Layers 1, 2, 4, and 8 when you click{" "}
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

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [selections, setSelections] = useState({});
  const [userNotes, setUserNotes] = useState(() => localStorage.getItem("user_notes") || "");
  const [openLayers, setOpenLayers] = useState({ macro: true });
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("llm_api_key") || localStorage.getItem("anthropic_key") || ""
  );
  const [selectionFileStatus, setSelectionFileStatus] = useState("No saved selection loaded yet.");
  const [keyStatus, setKeyStatus] = useState("STORED LOCALLY");
  const [selectionHistory, setSelectionHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const outputRef = useRef(null);
  const hasSelectionInitialized = useRef(false);

  // Memoized field index; used by Field to compute per-option conflict state.
  const fieldIndex = useMemo(() => buildFieldIndex(LAYERS), []);

  useEffect(() => {
    localStorage.setItem("user_notes", userNotes || "");
  }, [userNotes]);

  useEffect(() => {
    if (apiKey) localStorage.setItem("llm_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadDefaultApiKey() {
      try {
        const res = await fetch(DEFAULT_API_KEY_ENDPOINT);
        const payload = await res.json();

        if (!res.ok || !payload?.ok || !payload?.apiKey) return;

        if (!cancelled) {
          setApiKey(payload.apiKey);
          setKeyStatus(`AUTO-LOADED: ${payload.source}`);
        }
      } catch {
        if (!cancelled) {
          setKeyStatus("STORED LOCALLY");
        }
      }
    }

    loadDefaultApiKey();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(SELECTION_HISTORY_ENDPOINT);
        const payload = await res.json();
        if (!res.ok || !payload?.ok || !Array.isArray(payload?.entries)) return;

        if (!cancelled) {
          setSelectionHistory(payload.entries);
          setSelectedHistoryId((prev) => prev || payload.entries[0]?.id || "");
        }
      } catch {
        // history is optional; ignore fetch failures
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const setSelection = (id, v) =>
    setSelections((p) => ({ ...p, [id]: v }));

  useEffect(() => {
    if (!hasSelectionInitialized.current) {
      hasSelectionInitialized.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(LAST_SELECTION_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selections }),
        });
        const payload = await res.json();
        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.message || "Failed to save last selection");
        }

        let status = "Saved to last-selection.json in project root.";
        if (payload?.historyUpdated === false) {
          if (payload?.skippedReason === "empty") {
            status += " Skipped history snapshot (empty selection).";
          } else if (payload?.skippedReason === "duplicate") {
            status += " Skipped history snapshot (unchanged from latest).";
          }
        }
        setSelectionFileStatus(status);

        if (Array.isArray(payload?.historyEntries)) {
          setSelectionHistory(payload.historyEntries.slice(0, 10));
          setSelectedHistoryId((prev) => prev || payload.historyEntries[0]?.id || "");
        }
      } catch (e) {
        setSelectionFileStatus(`Save failed: ${e.message || String(e)}`);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selections]);

  const toggleLayer = (id) =>
    setOpenLayers((p) => ({ ...p, [id]: !p[id] }));

  const warnings = useMemo(() => validate(selections), [selections]);

  // Required non-multi fields for "ready to generate"
  const requiredIds = [
    "integrationType", "worldScale", "techLevel",
    "systemVisibility", "systemOrigin", "systemPurpose", "systemAlignment", "systemCeiling",
    "entryCondition", "startingState", "knowledgeAdvantage",
    "primaryConflict", "conflictOrigin",
    "resolutionMode", "protagonistOutcome",
    "archetype", "flawType", "primaryTheme",
  ];
  const missing = requiredIds.filter((id) => !selections[id]);
  const subplotOk = (selections.subplots || []).length >= 2 && (selections.subplots || []).length <= 4;
  const ready = missing.length === 0 && subplotOk;

  async function handleGenerate() {
    setError(null);
    setOutput(null);
    if (!apiKey) {
      setError("API key required (Anthropic or OpenAI).");
      return;
    }
    setLoading(true);
    try {
      const result = await callModel(apiKey, selections, {
        activeWarnings: warnings,
        userNotes,
      });
      setOutput({ ...result, selections });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function buildCopyText() {
    if (!output) return "";
    const lines = [];
    lines.push("═══════════════════════════════════════════");
    lines.push("  STORY SEED");
    lines.push("═══════════════════════════════════════════\n");
    lines.push(output.seed, "");
    lines.push("── LOCKED SYSTEM ─────────────────────────");
    lines.push(`Origin:    ${selections.systemOrigin || "—"}`);
    lines.push(`Purpose:   ${selections.systemPurpose || "—"}`);
    lines.push(`Alignment: ${selections.systemAlignment || "—"}`);
    lines.push(`Ceiling:   ${selections.systemCeiling || "—"}`);
    lines.push("");
    lines.push("── PROTAGONIST ───────────────────────────");
    lines.push(`Archetype: ${selections.archetype || "—"}`);
    lines.push(`Entry:     ${selections.entryCondition || "—"}`);
    lines.push(`Start:     ${selections.startingState || "—"}`);
    lines.push(`Knowledge: ${selections.knowledgeAdvantage || "—"}`);
    lines.push(`Flaw:      ${selections.flawType || "—"} — ${selections.flawArc || "—"}`);
    lines.push("");
    lines.push("── CONFLICT & ENDING (LOCKED) ────────────");
    lines.push(`Conflict:  ${selections.primaryConflict || "—"}`);
    lines.push(`Origin:    ${selections.conflictOrigin || "—"}`);
    lines.push(`Resolution:${selections.resolutionMode || "—"}`);
    lines.push(`Outcome:   ${selections.protagonistOutcome || "—"}`);
    lines.push("");
    lines.push("── THEMATIC QUESTION ─────────────────────");
    lines.push(output.themeQuestion || themeQuestion(selections));
    lines.push("");
    lines.push("── SUBPLOTS ──────────────────────────────");
    (selections.subplots || []).forEach((s) => lines.push(`• ${s}`));
    lines.push("");
    lines.push("── BEAT MAP (Save the Cat × your system) ─");
    (output.beats || []).forEach((b) => {
      lines.push(`\n[${b.name}]`);
      lines.push(b.description);
    });
    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCopyText());
  }

  async function handleLoadLastSelection() {
    try {
      const res = await fetch(LAST_SELECTION_ENDPOINT);
      const payload = await res.json();

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || "Unable to load last selection");
      }

      setSelections(payload.selections || {});
      setSelectionFileStatus("Loaded from last-selection.json.");
    } catch (e) {
      setSelectionFileStatus(`Load failed: ${e.message || String(e)}`);
    }
  }

  function formatHistoryLabel(entry, index) {
    const ts = entry?.timestamp ? new Date(entry.timestamp) : null;
    const readable = ts && !Number.isNaN(ts.valueOf())
      ? ts.toLocaleString()
      : "Unknown time";
    return `${index + 1}. ${readable}`;
  }

  function handleRestoreHistorySnapshot() {
    const selected = selectionHistory.find((item) => item.id === selectedHistoryId);
    if (!selected?.selections) {
      setSelectionFileStatus("No history snapshot selected.");
      return;
    }

    setSelections(selected.selections);
    setSelectionFileStatus(`Restored snapshot from ${new Date(selected.timestamp).toLocaleString()}.`);
  }

  return (
    <div style={S.root}>
      <div style={S.grid} />
      <div style={S.orb1} />
      <div style={S.orb2} />

      <div style={S.container}>
        <div style={S.header}>
          <div style={S.eyebrow}>PROGRESSION FANTASY · v1.0</div>
          <h1 style={S.h1}>
            STORY SEED GENERATOR
            <br />
            <span style={{ color: COLOR.purple }}>// LITRPG ARCHITECTURE</span>
          </h1>
          <p style={S.subtitle}>
            Work through layers 1–8. Each selection constrains the next. The ending is locked
            before writing begins. Compatibility rules run live. The model synthesizes the final
            blurb and maps your selections onto the 15 Save-the-Cat beats.
          </p>
          <div style={S.apiKeyRow}>
            <input
              type="password"
              placeholder="API key (Anthropic sk-ant-... or OpenAI sk-... / sk-proj-...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={S.apiKeyInput}
            />
            <span style={{ fontSize: "10px", color: COLOR.dim, letterSpacing: "2px" }}>
              {keyStatus}
            </span>
          </div>
        </div>

        {LAYERS.map((layer) => (
          <Layer
            key={layer.id}
            layer={layer}
            selections={selections}
            setSelection={setSelection}
            open={!!openLayers[layer.id]}
            onToggle={() => toggleLayer(layer.id)}
            fieldIndex={fieldIndex}
          />
        ))}

        {warnings.length > 0 && (
          <div style={S.warnBox}>
            <div style={S.warnTitle}>⚠ COMPATIBILITY WARNINGS ({warnings.length})</div>
            {warnings.map((w, i) => (
              <div key={i} style={S.warnItem}>→ {w}</div>
            ))}
          </div>
        )}

        {!ready && (
          <div style={{ ...S.warnBox, borderColor: COLOR.border, background: "rgba(138,92,246,0.05)" }}>
            <div style={{ ...S.warnTitle, color: COLOR.purpleSoft }}>◇ INCOMPLETE</div>
            {missing.length > 0 && (
              <div style={S.warnItem}>
                Missing selections: {missing.length} fields remain across layers 1, 2, 4, 8.
              </div>
            )}
            {!subplotOk && (
              <div style={S.warnItem}>
                Subplots: pick 2–4 (currently {(selections.subplots || []).length}).
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <label style={{ ...S.fieldLabel, marginTop: 0 }}>
            User Notes (optional) — passed verbatim to the model
          </label>
          <textarea
            style={S.notesTextarea}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Character names, settings, imagery, things to avoid, tone references… (stored locally in your browser)"
          />
        </div>

        <div style={S.actionRow}>
          <button
            style={S.generateBtn(!ready || loading)}
            disabled={!ready || loading}
            onClick={handleGenerate}
          >
            {loading ? "◌ GENERATING…" : "▶ GENERATE SEED"}
          </button>
          <button
            type="button"
            onClick={handleLoadLastSelection}
            style={S.utilityBtn}
            disabled={loading}
          >
            ↺ LOAD LAST SELECTION
          </button>
        </div>
        <div style={S.historyRow}>
          <select
            style={S.historySelect}
            value={selectedHistoryId}
            onChange={(e) => setSelectedHistoryId(e.target.value)}
            disabled={selectionHistory.length === 0 || loading}
          >
            <option value="">— history (latest 10) —</option>
            {selectionHistory.slice(0, 10).map((entry, i) => (
              <option key={entry.id} value={entry.id}>
                {formatHistoryLabel(entry, i)}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={S.restoreBtn}
            onClick={handleRestoreHistorySnapshot}
            disabled={!selectedHistoryId || loading}
          >
            ↺ RESTORE SELECTED
          </button>
        </div>
        <div style={S.statusLine}>{selectionFileStatus}</div>

        {error && (
          <div style={{ ...S.warnBox, marginTop: "16px" }}>
            <div style={S.warnTitle}>✗ ERROR</div>
            <div style={S.warnItem}>{error}</div>
          </div>
        )}

        {output && (
          <div style={S.output} ref={outputRef}>
            <button style={S.copyBtn} onClick={handleCopy}>COPY</button>
            <div style={{ fontSize: "10px", color: COLOR.purple, letterSpacing: "3px", marginBottom: "16px" }}>
              // OUTPUT
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: "13px",
                color: COLOR.text,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {buildCopyText()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function themeQuestion(s) {
  const t = s.primaryTheme;
  const map = {
    "Power vs Humanity": "Can you grow strong enough to matter without losing what made you worth saving?",
    "Control vs Freedom": "Is the order the system provides worth the autonomy it costs?",
    "Survival vs Morality": "Does surviving without your values still count as living?",
    "Progress vs Identity": "Does becoming more mean leaving behind who you were?",
    "Knowledge vs Consequence": "Is knowing the truth worth the agency it destroys?",
    "Individual vs Collective": "Does your growth serve only you, and if so — is that enough?",
    "Truth vs Comfort": "Is understanding the system's real purpose worth shattering everything you believed?",
  };
  return map[t] || "—";
}
