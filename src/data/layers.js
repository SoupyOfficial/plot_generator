// src/data/layers.js
//
// LAYERS schema — extracted from App.jsx (Phase 14 prep).
//
// LAYERS describes the entire question schema the user fills out.
// Keeping it in /data instead of inline in the React component:
//   - lets pure-function libs (validation, prompt, fillRest, reverseEngineer)
//     unit-test against the real schema without rendering React,
//   - unblocks "genre packs" — multiple LAYERS arrays selected at runtime,
//   - keeps App.jsx focused on UI / state.
//
// All option / tag / forbids / requires semantics live in
// src/lib/options.js + src/lib/validation.js.

import { SYSTEM_STORY_DESIGN } from "../../system_story_data.js";

export const SYSTEM_PURPOSE_OPTIONS = SYSTEM_STORY_DESIGN.archetypes.map(
  (a) => `${a.label} — ${a.goal}`
);

export const RESOLUTION_MODE_OPTIONS = Array.from(
  new Set([
    ...SYSTEM_STORY_DESIGN.resolutionModes.map((r) => `${r.label} (${r.desc})`),
    "Destruction (system ends)",
  ])
);

export const LAYERS = [
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
            id: "subgenre",
            label: "Subgenre (declare the shelf)",
            options: [
              {
                value: "Genre-agnostic",
                description: "No subgenre commitment; let the other layers decide the shelf.",
              },
              "Classical progression fantasy (cultivation / ranks)",
              "LitRPG (visible stats & levels)",
              "System apocalypse",
              "Portal / isekai",
              "Dungeon core",
              "Cozy LitRPG / low-stakes",
              "Regression / time loop",
              "Xianxia / wuxia",
              "Magical academy",
              "Superhero progression",
              "Post-apocalyptic survival",
            ],
          },
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
            id: "protagonistOrigin",
            label: "Protagonist Origin (where the soul comes from)",
            options: [
              {
                value: "Native — born in this world",
                description: "No outside frame; world rules are the only rules they've ever known.",
                tags: ["native"],
              },
              {
                value: "Isekai — transported with own body",
                description: "Fish-out-of-water; modern values vs. fantasy norms create friction.",
                tags: ["isekai"],
              },
              {
                value: "Reincarnation — full rebirth, prior-life memory",
                description: "New body, old soul. Childhood-as-second-chance shapes pacing.",
                tags: ["reincarnation"],
              },
              {
                value: "Transmigration — soul swap into another body in this world",
                description: "Inhabits an existing person; obligations + relationships are inherited.",
                tags: ["transmigration"],
              },
              {
                value: "Regression — woken up earlier in own timeline",
                description:
                  "Foreknowledge engine. MUST compound — see Returner archetype.",
                tags: ["regression", "foreknowledge", "compounding-required"],
              },
              {
                value: "Awakened — latent native, triggered later",
                description: "Lived as ordinary; a key moment unlocks what was always there.",
                tags: ["awakened"],
              },
              {
                value: "Constructed — artificial origin (AI / homunculus / dungeon core)",
                description: "Non-human or non-organic; identity forms in real time.",
                tags: ["constructed"],
              },
              {
                value: "Reborn into a novel / game (meta)",
                description:
                  "Knows the plot. Meta-knowledge as cheat — but the world rewrites itself around them.",
                tags: ["reborn-in-novel", "foreknowledge", "compounding-required"],
              },
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
          {
            id: "progressionRungs",
            label: "Progression Ladder (optional)",
            options: [
              {
                value: "Cultivation — 9 named realms",
                description:
                  "Body Tempering → Foundation → Core → Nascent Soul → Spirit Severing → Dao Seeking → Immortal → Ascendant → Transcendent.",
              },
              {
                value: "LitRPG — numeric levels (1–100)",
                description: "Tier gates every 10 levels; stats allocatable on level up.",
              },
              {
                value: "Metal tiers — Bronze → Silver → Gold → Diamond → Legendary",
                description: "Clear visible tier walls; each tier is a mini-arc.",
              },
              {
                value: "Academy — year-based (Freshman → Senior → Graduate)",
                description: "School structure doubles as progression rhythm.",
              },
              {
                value: "Custom — define your own rungs below",
                description: "Use the 'Custom rungs' field to list them in order.",
              },
            ],
          },
          {
            id: "progressionCustomRungs",
            label: "Custom rungs (optional) — comma or arrow separated, in order",
            freeform: true,
            placeholder: "e.g. Initiate → Apprentice → Adept → Master → Grandmaster",
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
      {
        id: "engine",
        title: "2.6 Structural Engine (the trope that drives chapter cadence)",
        components: [
          {
            id: "storyEngine",
            label: "Primary story engine",
            options: [
              {
                value: "Tournament arc",
                description: "Bracketed combat; rivals as opponents; climax = final match. Mage-school staple.",
                tags: ["tournament"],
              },
              {
                value: "Tower climb",
                description: "Linear floor-by-floor ascent; fixed top; ranking pressure. Solo Leveling, Tower of God.",
                tags: ["tower-climb"],
              },
              {
                value: "Dungeon delve / expedition rotations",
                description: "Episodic excursions; loot-and-level loop; rest between runs. Delve, Wandering Inn.",
                tags: ["dungeon-delve", "expedition"],
              },
              {
                value: "Regression / time loop",
                description: "Foreknowledge as engine; deviations compound. Mother of Learning, Re:Zero.",
                tags: ["regression-loop", "foreknowledge", "compounding-required"],
              },
              {
                value: "Base / settlement building",
                description: "Construction, defense, recruitment. Builder archetype's home turf.",
                tags: ["base-building", "constructive"],
              },
              {
                value: "Wave defense / integration apocalypse",
                description: "Escalating attacks; survival between waves; tier-pressure. DCC, Apocalypse-LitRPG core.",
                tags: ["wave-defense"],
              },
              {
                value: "War campaign",
                description: "Faction war as backbone; battles as acts; victory/loss as beats.",
                tags: ["war-campaign"],
              },
              {
                value: "Investigation / mystery thread",
                description: "Clue → suspect → confrontation. Pairs with Knowledge-vs-Consequence theme.",
                tags: ["investigation", "mystery", "mystery-friendly"],
              },
              {
                value: "Revenge quest",
                description: "Linear hit-list; obsession-coded; escalates toward target.",
                tags: ["revenge-quest"],
              },
              {
                value: "Slice-of-life drift",
                description: "Cozy default; community + crafting + small stakes. Anti-escalation by design.",
                tags: ["slice-of-life"],
              },
              {
                value: "Academy arc (year-by-year)",
                description: "School calendar = structure; graduation = Act III pivot. MoL, Arcane Ascension.",
                tags: ["academy-arc"],
              },
              {
                value: "Hybrid (multiple engines layered)",
                description: "More than one chapter cadence at once — handle deliberately, not by default.",
              },
            ],
          },
          {
            id: "engineCadence",
            label: "Engine cadence (how often it cycles)",
            options: [
              "Weekly / chapter-tight (each chapter advances the engine)",
              "Arc-tight (every 5–10 chapters one full cycle)",
              "Volume-tight (each book is one cycle)",
              "Background (the engine is texture, not structure)",
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
        id: "lifeStage",
        title: "4.0 Life Stage & Coming-of-Age",
        components: [
          {
            id: "protagonistLifeStage",
            label: "Life Stage",
            options: [
              {
                value: "Adolescent / Coming-of-Age (13–19)",
                description:
                  "Identity formation, first competence, peers eclipse family. Classic shounen / academy energy.",
                tags: ["adolescent"],
              },
              {
                value: "Threshold Adult (20–25)",
                description:
                  "Independence and first real stakes. Most webnovel MCs default here.",
                tags: ["threshold-adult"],
              },
              {
                value: "Quarter-Life Reckoning (25–32)",
                description:
                  "Career failure, deferred dreams, 'I'm behind' panic. Burnout-isekai engine. DCC's Carl, BoC's Jin.",
                tags: ["quarter-life"],
              },
              {
                value: "Mid-Life Reforging (33–45)",
                description:
                  "Marriage / parenting / divorce; decline-meets-new-power. 'Dad gets a system.' Cradle-adjacent for older protagonists.",
                tags: ["mid-life"],
              },
              {
                value: "Late-Career Pivot (45–60)",
                description:
                  "Second act; mentorship as identity; reconciling with former self. Retired-soldier-reborn.",
                tags: ["late-career"],
              },
              {
                value: "Elder / Twilight (60+)",
                description:
                  "Legacy, succession, body as antagonist. Legends & Lattes, retired-hero LitRPG.",
                tags: ["elder"],
              },
              {
                value: "Generational (POV spans decades / multiple stages)",
                description:
                  "Time-skips as structure; identity across life stages. BoC family arcs, dynastic sagas.",
                tags: ["generational"],
              },
            ],
          },
          {
            id: "comingOfAgeAxis",
            label: "Identity-transition axis (what the story is actually about)",
            options: [
              {
                value: "First competence — am I capable?",
                description: "Classic teen-coded engine, but works for any reset (post-divorce, post-disability, post-burnout).",
                tags: ["first-competence"],
              },
              {
                value: "First moral compromise — am I still good?",
                description: "The first irreversible choice. Sits naturally in late-Act-2.",
                tags: ["moral-compromise"],
              },
              {
                value: "First love or first loss",
                description: "The relationship that calibrates the protagonist's emotional weather.",
                tags: ["first-love-loss"],
              },
              {
                value: "Vocation / calling clarification",
                description: "What am I actually for? Strong fit for crafters, healers, builders.",
                tags: ["vocation"],
              },
              {
                value: "Authority transfer — taking the mantle",
                description: "Inheriting from parent / mentor / faction; succession as transformation.",
                tags: ["authority-transfer"],
              },
              {
                value: "Body change — puberty, illness, augmentation, post-system body",
                description: "The body itself becomes the site of transformation. Underused in genre.",
                tags: ["body-change"],
              },
              {
                value: "Reckoning with prior self (regression / post-burnout / post-divorce)",
                description: "The 25+ engine: confronting who you were vs. who you're becoming.",
                tags: ["reckoning-prior-self"],
              },
              {
                value: "Parenthood as transformation",
                description: "Becoming responsible for a smaller life. Dad-isekai, mama-bear, found-child arcs.",
                tags: ["parenthood"],
              },
              {
                value: "Class / economic crossing",
                description: "Crossing a station boundary — peasant-to-noble, broke-to-system-rich, exile-returns.",
                tags: ["class-crossing"],
              },
              {
                value: "Mortality acceptance — what do I leave behind?",
                description: "Late-life engine; legacy and succession take center stage.",
                tags: ["mortality"],
              },
            ],
          },
          {
            id: "maturityModel",
            label: "Maturity model (how growth happens)",
            options: [
              "Earned (slow, costed)",
              "Forced (trauma-driven)",
              "Performed (mask of competence over fragility)",
              "Refused (arrested development; growth via friction)",
            ],
          },
        ],
      },
      {
        id: "identity",
        title: "4.0b Identity & Body",
        components: [
          {
            id: "protagonistClass",
            label: "Protagonist Class (genre identity — orthogonal to archetype)",
            options: [
              {
                value: "Warrior / Berserker",
                description: "Frontline; physical mastery; identity through combat.",
                tags: ["warrior"],
              },
              {
                value: "Mage / Elementalist",
                description: "Manipulates fundamental forces; theory-heavy progression.",
                tags: ["mage"],
              },
              {
                value: "Knight / Paladin",
                description: "Oath-bound; identity inseparable from a code or order.",
                tags: ["knight"],
              },
              {
                value: "Rogue / Assassin",
                description: "Information, positioning, and lethality. Often morally ambiguous.",
                tags: ["rogue"],
              },
              {
                value: "Archer / Ranger",
                description: "Range, scouting, wilderness mastery. Often loner-coded.",
                tags: ["ranger"],
              },
              {
                value: "Healer / Support",
                description: "Power expressed through other people. Relational by design.",
                tags: ["healer"],
              },
              {
                value: "Summoner / Tamer",
                description: "Power is a roster of bonded entities. Companion-heavy plot.",
                tags: ["summoner", "beast-tamer"],
              },
              {
                value: "Necromancer",
                description: "Death as resource. Forces moral / theological pressure on every page.",
                tags: ["necromancer"],
              },
              {
                value: "Crafter / Artificer",
                description: "Power through making. Pairs with crafting / utility power expression.",
                tags: ["crafter"],
              },
              {
                value: "Alchemist",
                description: "Transmutation, potions, body modification. Often sect / academy coded.",
                tags: ["alchemist"],
              },
              {
                value: "Enchanter",
                description: "Imbues objects; force-multiplier for allies; world-shaping at scale.",
                tags: ["enchanter"],
              },
              {
                value: "Merchant / Information broker",
                description: "Capital and intel as power. Politics-heavy by default.",
                tags: ["merchant"],
              },
              {
                value: "Bard / Skald",
                description: "Words, music, persuasion as quantified power. Rare; high-leverage.",
                tags: ["bard"],
              },
              {
                value: "Unique class (bespoke; one-of-a-kind)",
                description:
                  "System-issued or self-defined unique class. Cheat-coded; pair with anti-drift mechanisms.",
                tags: ["unique-class"],
              },
              {
                value: "Classless / off-script",
                description:
                  "System refuses to slot the protagonist. Identity-as-friction with the system itself.",
                tags: ["classless"],
              },
              {
                value: "Monster / non-human POV",
                description:
                  "Kobold, slime, dragon, dungeon core. Alien viewpoint reframes every beat.",
                tags: ["monster-pov"],
              },
            ],
          },
          {
            id: "relationalAnchor",
            label: "Relational anchor (the person/people whose existence shapes the protagonist)",
            options: [
              {
                value: "None — fundamentally alone",
                description: "Lone-wolf default. Use sparingly; risks emotional flatness.",
                tags: ["lone-wolf"],
              },
              {
                value: "Duo / partner-in-crime",
                description: "One sustained companion. Friction and balance baked in.",
                tags: ["duo"],
              },
              {
                value: "Rival-pair (the antagonist IS the anchor)",
                description: "Identity formed in opposition. Cradle-style.",
                tags: ["rival-pair"],
              },
              {
                value: "Found family / chosen circle",
                description: "Built over time. Strongest engine for long serials.",
                tags: ["found-family-bond", "found-family"],
              },
              {
                value: "Blood family (parents / siblings)",
                description: "Inherited obligation. Fertile for class-crossing and inheritance themes.",
                tags: ["blood-family"],
              },
              {
                value: "Spouse / romantic partner",
                description: "A relationship that pre-exists the story. Underused; high-leverage for 25+.",
                tags: ["spouse"],
              },
              {
                value: "Dependent child (theirs or adopted)",
                description: "A smaller life to protect. Forces stakes-realism on every choice.",
                tags: ["child-dependent"],
              },
              {
                value: "Dependent elder (parent / mentor / patient)",
                description: "Care-giving as engine. Underused; pairs naturally with mid-life stages.",
                tags: ["elder-dependent"],
              },
              {
                value: "Master ↔ disciple bond",
                description: "Asymmetric vertical bond. Cultivation / academy default.",
                tags: ["master-disciple"],
              },
              {
                value: "Community / village / settlement",
                description: "A collective, not a person. Cozy / base-building default.",
                tags: ["community"],
              },
            ],
          },
          {
            id: "bodyAndMortality",
            label: "Body & mortality (the physical site of the story)",
            options: [
              {
                value: "Youthful invulnerability (default genre baseline)",
                description: "Body as resource pool, not constraint. Most LitRPG defaults here.",
                tags: ["youthful"],
              },
              {
                value: "Chronic illness / pain",
                description:
                  "Body is unreliable; system interaction reframes it. Powerful and underused.",
                tags: ["chronic-illness"],
              },
              {
                value: "Aging body (decline meets new power)",
                description:
                  "Mid-life / late-career staple. The system's gift collides with biological reality.",
                tags: ["aging"],
              },
              {
                value: "Disabled / restricted at start",
                description:
                  "System interacts with the impairment — does it remove it, route around it, refuse to?",
                tags: ["disabled"],
              },
              {
                value: "Augmented (cyber / engraved / runed)",
                description: "Body is partially built. Identity as ship-of-Theseus.",
                tags: ["augmented"],
              },
              {
                value: "Post-human / transformed",
                description:
                  "Inhuman after a key beat. Pairs with Apotheosis / Transcendence outcomes.",
                tags: ["post-human"],
              },
              {
                value: "Body-dysphoric (wrong body / new body)",
                description:
                  "Common in transmigration / reincarnation. Foregrounds the body-as-question.",
                tags: ["dysphoric"],
              },
            ],
          },
        ],
      },
      {
        id: "archetype",
        title: "4.1 Relationship to the System",
        components: [
          {
            id: "archetype",
            label: "Archetype (dramatic role — pairs with Class above)",
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
          {
            id: "archetypeFlavor",
            label: "Personality Flavor (optional — overlay on the role)",
            options: [
              "Stoic operator",
              "Charming rogue",
              "Idealist / true-hearted",
              "Cynic with a soft center",
              "Scholar / obsessive learner",
              "Warrior-poet",
              "Wry deadpan",
              "Zealot / driven by conviction",
              "Reluctant everyman",
              "Ruthless pragmatist",
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
            id: "toneSeriousness",
            label: "Seriousness axis",
            options: [
              "Played straight (serious)",
              "Wry / dry-witty",
              "Comedic with real stakes",
              "Full comedy / farce",
            ],
          },
          {
            id: "toneOptimism",
            label: "Optimism axis",
            options: [
              "Hopeful / bright",
              "Bittersweet",
              "Grim but not nihilistic",
              "Nihilistic / bleak",
            ],
          },
          {
            id: "primaryTone",
            label: "Primary Tone (dominant flavor)",
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
              {
                value: "Belonging vs Exceptionalism",
                description:
                  "Does being chosen / unique cost the protagonist their place among ordinary people?",
                tags: ["belonging"],
              },
              {
                value: "Found Family vs Isolation",
                description:
                  "Is the protagonist building a circle that holds, or proving they don't need one?",
                tags: ["found-family"],
              },
              {
                value: "Becoming vs Returning",
                description:
                  "Is growth the point, or is restoration the point? (Especially potent for regression / reincarnation MCs.)",
                tags: ["becoming"],
              },
              {
                value: "Inheritance vs Self-Authorship",
                description:
                  "Whose story is the protagonist actually living — their lineage's, the system's, or their own?",
                tags: ["self-authorship"],
              },
              {
                value: "Duty vs Desire",
                description:
                  "Obligation (system, family, role) vs. what the protagonist actually wants for themselves.",
                tags: ["duty-vs-desire"],
              },
              {
                value: "Legacy vs Reinvention",
                description:
                  "Late-life and 25+ engine: build on what you were, or burn it down and start over?",
                tags: ["legacy"],
              },
              {
                value: "Revenge vs Moving On",
                description:
                  "The hit-list as identity vs. letting the wound close. Pairs with Revenge-quest engine.",
              },
              {
                value: "Tradition vs Innovation",
                description:
                  "The old ways' wisdom vs. the new method's power. Cultivation / sect stories live here.",
              },
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
              "Belonging vs Exceptionalism",
              "Found Family vs Isolation",
              "Becoming vs Returning",
              "Inheritance vs Self-Authorship",
              "Duty vs Desire",
              "Legacy vs Reinvention",
              "Revenge vs Moving On",
              "Tradition vs Innovation",
              "None",
            ],
          },
        ],
      },
    ],
  },
];
