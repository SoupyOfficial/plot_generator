# Research & Review — Genre, Options, Usability

Review pass before committing to additional Phase-4b/5/6 work. This document
audits what we have, surveys the genre/design landscape, and proposes a
prioritized set of changes with reasoning.

> Scope: Progression Fantasy + LitRPG + adjacent (xianxia / cultivation,
> apocalypse LitRPG, dungeon core, cozy LitRPG, Korean regression/tower genre).
> Sources: Wikipedia articles on LitRPG and Progression Fantasy (updated 2026),
> NN/G articles on Wizards and Progressive Disclosure, lived reading of the
> genre's top titles (Cradle, DCC, HWFWM, Mother of Learning, Beware of Chicken,
> Primal Hunter, Defiance of the Fall, Worm, Super Supportive, etc.).

---

## 1. Current State — What we have

| Layer | Fields | Options per field (avg) |
|-------|--------|--------------------------|
| 1. Macro | 12 | ~5 |
| 2. Mid | 14 | ~5 |
| 3. Subplots | 1 multi | 12 |
| 4. Protagonist | 5 | 5–8 |
| 5. Beats | informational only | — |
| 6. Micro | 6 | 4–6 |
| 7. Series | 3 | 4–8 |
| 8. Theme | 2 | 7 (primary) |

**~35 fields, ~160 option tokens total.** Coverage is strong on *structure*
(Save the Cat beats, system-purpose archetypes) and weak on *genre identity*
(subgenre conventions, progression taxonomy, protagonist origin story).

### Strengths
- Ending-first design (LOCKED ending + 15-beat back-solve) is genuinely rare and
  great — this is the generator's unique value.
- Validation rules encode real authorial pitfalls (costless power, open-ended
  drift, Returner-without-foreknowledge, etc.).
- Layer 1.2 "System Purpose / hidden archetype" is clever and author-grade.

### Weaknesses
1. **No subgenre identity axis.** A cozy-LitRPG like *Beware of Chicken* and an
   apocalypse LitRPG like *DCC* need totally different beat-maps — but the
   generator treats them as interchangeable setting choices.
2. **No progression taxonomy.** Progression fantasy's *defining trait* per
   Wikipedia is "quantifiable magic systems graded in discrete stages/ranks."
   We have `progressionMechanic` ("Class-based / stat-based / cultivation /
   skill tree / …") but no rank/tier ladder, no cap breakpoints, no
   "which rank does book 1 end at" question.
3. **Protagonist archetype list is dramatic-function-only.** We have Returner,
   Defier, etc. — all good — but we lack *identity archetypes* that dominate
   the genre: Summoner/Tamer, Necromancer, Crafter, Commerce/Merchant, Monster
   POV, Dungeon Core, Tower Climber, Villain POV, Healer, Support-class.
4. **No origin/entry specificity.** "Portal fantasy" vs. "System apocalypse"
   covers worlds but not *persons*: reincarnation, transmigration (into a
   novel/game), regression (second life), native prodigy, hidden lineage.
5. **Companions / party / harem axis missing.** Solo vs. party vs. guild vs.
   romantic interest count dramatically changes beat pacing.
6. **No "cheat" / unique-advantage dial.** A huge fraction of the genre hinges
   on the MC being exceptional in a specific way (unique class, gamer mind,
   system exploit, admin access). Currently implicit in "knowledgeAdvantage"
   but that field is narrower than readers expect.
7. **Theme list is earnest but narrow.** 7 options; missing several that drive
   bestselling books (Revenge, Found Family, Nature vs. Civilization, Faith vs.
   Doubt, Tradition vs. Innovation, Belonging vs. Exceptionalism).
8. **Tone axis is single-dimensional.** One "primary tone" field, but the genre
   splits cleanly on two largely-independent axes (seriousness × optimism).
9. **All fields are flat string arrays (in most places).** Phase 1 migrated
   ~4 fields to objects with `forbids`; the other ~30 still lack descriptions
   and metadata, so the model gets underfed.
10. **No presets.** First-time users stare at 35 empty fields. There's no
    "Start me at Cradle-like cultivation" or "DCC-style apocalypse" shortcut.

---

## 2. Genre Research — What the market rewards

### 2.1 Subgenre clusters we should model as a first-class field

Dominant clusters (each has distinct beat conventions, so this should actively
bias downstream options):

| Subgenre | Examples | Beat-defining conventions |
|----------|----------|---------------------------|
| **Xianxia / Cultivation** | Cradle, I Shall Seal the Heavens | Ranked cultivation ladder; sect politics; dao/heart demons; master-disciple |
| **Apocalypse LitRPG** | DCC, Defiance of the Fall, Primal Hunter | Integration day; survival tier; Earth-or-not-Earth; AI/administrator figures |
| **Dungeon Core** | Dungeon Born, Pylon of the Core | Non-human MC; base building; defender-perspective; invasion arcs |
| **Tower Climbing** | SSS-Class Revival Hunter, *Solo Leveling* | Linear ascent; floor bosses; fixed top; competitive rankings |
| **Cozy / Slice-of-life** | Beware of Chicken, Small Medium | Low stakes; community; crafting; romance-forward; deliberately anti-escalation |
| **Virtual / Trapped-in-game** | Sword Art Online, Log Horizon, Legendary Moonlight Sculptor | Game-is-real stakes; logout anxiety; NPC identity; devs-as-gods |
| **Academy / Magic school** | Mother of Learning, Arcane Ascension | Tournament arcs; faculty hierarchy; graduation ≈ Act III pivot |
| **Regression / Time-loop** | Mother of Learning, Second Life Ranker, The Beginning After the End | Foreknowledge becomes the engine; compounding deviations; loop-as-cost |
| **Reincarnation / Transmigration** | Beware of Chicken, Villainess genre | Prior-life knowledge, fish-out-of-water identity, meta-knowledge of plot |
| **Superhero / Powers** | Worm, Super Supportive | Power origin; public vs. private identity; trigger events |
| **Dungeon delver / Adventurer** | The Wandering Inn, Delve | Episodic expeditions; guild structure; loot-and-level loop |
| **Monster / Non-human POV** | Salvos, Ave Xia Re Due, Chrysalis | Alien perspective; assimilation vs. identity; stat-screens for kobolds etc. |

**Design move:** Add a `subgenre` field in Layer 1.0 (before anything else).
Its value should **reorder and pre-filter** subsequent options. Cultivation +
stat-screen is valid but rare; Cultivation + "Full UI (notifications)" should
be deprioritized in the default suggestion.

### 2.2 Progression taxonomy (Phase-5 advanced field, strong payoff)

A true progression-fantasy tool needs *quantifiable ladders*. Propose a nested
field:

```
- progressionLadder: { kind: "ranks" | "levels" | "stages" | "tiers" | "none",
                       rungs: string[] (user-editable or preset) }
```

Presets:
- **Cradle-like:** Copper → Iron → Jade → Gold → Lord → Sage → Herald → Monarch → Dreadgod
- **Cultivation (xianxia classic):** Body Refining → Qi Condensation → Foundation → Core Formation → Nascent Soul → Soul Transformation → Ascension
- **Apocalypse LitRPG:** Levels 1–10 → 11–25 → 26–50 → 51–99 → 100 / Evolution → Class Evolution
- **Tower:** Floors 1–100 (explicit)
- **Cradle-by-numbers:** 1–9 per rank × 9 ranks = 81 stages

Plus: `bookOneEndTier` (where does book 1 stop?) — massively shapes Act III.

### 2.3 New archetype axis: identity vs. dramatic function

Separate the existing `archetype` field into two:

- **`protagonistRole`** (dramatic function; what we currently have):
  Returner, Defier, Investigator, Exploiter, Reluctant Chosen, Underdog,
  Outcast, Chosen One, Anti-hero, Monster POV, etc.
- **`protagonistClass`** (genre identity; new):
  Summoner/Tamer, Necromancer, Crafter/Artificer, Merchant, Healer/Support,
  Assassin/Rogue, Knight/Paladin, Mage/Elementalist, Warrior/Berserker,
  Archer/Ranger, Beast-tamer, Alchemist, Enchanter, Bard, "Unique class"
  (bespoke), Classless.

### 2.4 Protagonist origin (new field — high leverage)

- Native (of this world, born here)
- Transmigration — soul swap into another body in this world
- Reincarnation — full rebirth, prior-life memory
- Isekai — transported with own body
- Regression — woken up earlier in own timeline
- Transmigrated into a novel/game (meta)
- Awakened — latent native, triggered later
- Constructed — artificial origin (AI, homunculus, golem-core)

### 2.5 Cheat / unique-advantage dial

- None (zero-to-hero)
- Unique class / evolution path
- Gamer mind (emotional regulation, pattern recognition)
- System bug / exploit
- Admin / developer access
- Foreknowledge (from regression/reincarnation)
- Hidden lineage
- Familiar / patron (divine or eldritch)
- Cheat item (sword that levels with user, etc.)

### 2.6 Companion / party structure

- Solo (lone protagonist)
- Pair (duo/rival/companion animal)
- Small party (3–5)
- Guild / faction
- Harem-coded ensemble
- Base-building community
- Master-disciple
- Family-as-party (*Beware of Chicken* mode)

### 2.7 Tone — split into two orthogonal axes

Currently: single "primaryTone" field conflates seriousness and optimism.
Change to:

- **`toneSeriousness`:** Comedic ↔ Balanced ↔ Grim ↔ Grimdark
- **`toneOptimism`:** Hopeful ↔ Pragmatic ↔ Cynical ↔ Despairing
- Drop `toneConsistency` as its own field; make it an option description on
  `toneSeriousness` ("Switches between comedic and grim by arc" is one value).

### 2.8 Themes we're missing

Add these to `primaryTheme` (one axis):
- Revenge vs. Moving On
- Found Family vs. Isolation
- Nature vs. Civilization
- Faith vs. Doubt
- Tradition vs. Innovation
- Belonging vs. Exceptionalism
- Duty vs. Desire

Plus an **`antiTheme`** field (what the book argues *against*) — author's
intent counterweight, already referenced in roadmap Phase 5.

---

## 3. Design / UX Research

Distilled from NN/G (*Wizards* and *Progressive Disclosure* articles) and
applied to our case.

### 3.1 Our current pattern is *staged disclosure*, not a wizard

Per NN/G: wizards enforce linear order; staged disclosure reveals features as
sequence progresses. We let users jump around and collapse layers — that's
staged disclosure by their taxonomy. Good.

**Implication:** We shouldn't force linear progress. But we *should* do the
things wizards do well:
- Show a **progress indicator** (current: "X fields remain" buried in warnings)
- Label each step descriptively (✓ done; we have layer titles)
- Make steps **self-sufficient** — don't require scrolling to layer 4 to decide
  layer 1 (partially violated — e.g. the "Returner needs foreknowledge" rule
  relates Layer 4 selection to Layer 1 selection)

### 3.2 Progressive disclosure — advanced fields

Quote: *"Use progressive disclosure when features have a natural primary/
secondary split."* Our Phase 5 already calls for this. Concrete:

- Each layer gets a visible "Advanced" collapsed `<details>` below its required
  fields.
- Advanced fields only appear if the subgenre/progression-ladder selections
  warrant them (e.g. cultivation ladder questions only show when subgenre ∈
  {cultivation, xianxia, cradle-like}).
- Hard rule from NN/G: **don't go past two disclosure levels.** So no nested
  "Advanced → Expert → Super-expert". Flatten if we hit that.

### 3.3 Presets = "reuse selections as defaults" (NN/G wizard tip 8)

NN/G: *"Consider reusing the user's selections from previous use as the
defaults."* We already persist last selection; turn it into a first-class
feature:

- Add **"Start from…"** picker at top with options:
  - My last seed
  - Cradle-like cultivation
  - DCC apocalypse
  - Cozy LitRPG
  - Mother-of-Learning-style regression academy
  - Blank
- Each preset pre-fills 15–20 fields (leaves protagonist-specific blank for
  user to personalize).

### 3.4 Tag-based option matching (already roadmapped; formalize now)

Every option gets `tags: string[]`. Tag taxonomy (v1):
- **Mood:** distrust, hope, dread, wonder, claustrophobia
- **Genre fingerprint:** cultivation, apocalypse, cozy, dungeon-core, tower
- **Structure:** mystery, puzzle, siege, tournament, chase
- **Character:** rivalry, mentor, lone-wolf, found-family
- **Power:** hard-magic, soft-magic, costful, costless, quantified

Downstream effects:
- Options whose tags overlap current selections float to top with a subtle
  indicator (roadmap 4b).
- The model prompt ends up with a **tag cloud** section summarizing emergent
  identity: "This story reads as: cultivation + tournament + mentor + costful."

### 3.5 "Fill the rest with me" (roadmap Phase 7) is the killer feature

Research consensus: long forms kill conversion. The tool's unique claim is
*author-grade structural depth* — but asking a user to pick 35 values first is
at odds with exploring. The solution NN/G recommends for dynamic forms is
fork-on-input; our equivalent is **AI fork-on-input**: user picks 3–5 pillars
(subgenre, theme, resolutionMode, archetype, cost) and the model proposes the
other 30 with rationales the user accepts/rejects field-by-field.

### 3.6 Coherence score / vibe check widget

Borrowed from character-creation UIs in RPGs (Baldur's Gate 3, Pathfinder WotR):
show a live score/chip block summarizing internal consistency:

> **Coherence: 82%** · tagged as `cultivation`, `mentor`, `tournament`, `hard-magic`, `costful`
> **Strongest arcs detected:** master-disciple rivalry; purity-of-dao theme
> **Potential friction:** your `techLevel: Near-future` rarely coexists with cultivation.

Computes from tag overlap + forbid violations + cross-cutting rules. Gives the
user a "system" response at every click, not just when they hit Generate.

### 3.7 Explainer chips for warnings

Current warnings are plain strings. Make them expandable chips:
- ⚠ chip ("Costless power + no human cost")
- → click → panel with the `story_anatomy.md` rule text + an "Apply fix"
  button that mutates selections (set subplot to include "Romance", etc.)

### 3.8 Share/URL state

URL-encode selections (base64 of JSON, or hash) so users can:
- Bookmark a half-finished seed
- Share "my cozy-cultivation preset" with friends
- Diff two seeds side-by-side

Costs nothing architecturally (all state is local; just serialize to hash).

### 3.9 Output ergonomics (Phase 8 nice-to-haves, elevate priority)

- **Beat re-roll (v1 range mode).** Prioritize ranged reroll (e.g., keep
  beats 1–5; redo 6–15) over single-beat-only.
- **Pin-then-vary.** "Keep beats 1–5; redo 6–15 from a darker angle."
- **Export as Markdown / Scrivener-friendly.**
- **Save named presets.** Not just "last selection" — "my-cozy-seed",
  "my-cultivation-seed", "urban-fantasy-regression".

---

## 4. Architectural Patterns

### 4.1 Move option data out of `App.jsx` into `src/data/*.js`

`App.jsx` is 900+ lines and 70% of it is the LAYERS data structure. Moving to
`src/data/layers.js` (component defs) and `src/data/options/<field>.js`
(per-field option banks with descriptions/tags/forbids) would:
- Unblock contributor edits to option banks without touching JSX
- Enable loading option banks conditionally (cultivation pack, apocalypse pack)
- Improve lazy-loading (only load the 12 archetype descriptions when Layer 4
  expands)

### 4.2 Genre "packs" — pluggable subgenre extensions

Each pack is a module:
```js
// src/packs/cultivation.js
export default {
  id: "cultivation",
  label: "Cultivation / Xianxia",
  extends: "litrpg-base",
  fieldOverrides: { progressionMechanic: { defaultValue: "Cultivation (qi/energy)" } },
  newOptions: {
    archetype: [/* Inner-demon Confronter, Sect Heir, Mortal Ascendant, ... */],
    antagonistType: [/* Rival cultivator from senior sect, heart demon, ... */],
  },
  newFields: [
    { id: "cultivationPath", label: "Cultivation Path", options: [...] },
    { id: "sectAffiliation", label: "Sect Affiliation", options: [...] },
  ],
  presetSelections: { /* 15-field preset for "cultivation" starter */ },
};
```

User picks a pack at the top; pack merges over the base schema. Enables
community contributions without touching core.

### 4.3 Schema-as-data + runtime validation

Current: component definitions are JS objects → flexible but untyped. Moving
to a JSON-schema-compatible description would let us:
- Write option banks as pure JSON
- Validate them at load time (`Zod` / `Valibot` / bespoke checker)
- Generate TypeScript types if we ever port

Not urgent. Flag for "when option banks hit ~300 values."

### 4.4 Tag taxonomy file

A single `src/data/tags.js` enumerating allowed tag values. Enforce at
normalization: `normalizeOption(opt)` rejects unknown tags. Keeps the taxonomy
clean as it grows.

### 4.5 Observability

Add a dev-only panel that shows:
- current tag-bag
- fired forbids
- fired cross-cutting rules
- "why is this option greyed out"

Shift-click a disabled option → console.logs the full conflict graph. Cheap
dev ergonomics; will pay back during option expansion.

---

## 5. Prioritized Recommendations

Grouped by leverage-per-effort; numbers are suggestive, not absolute.

### Tier A — high leverage, contained effort

| # | Change | Why |
|---|--------|-----|
| A1 | Add **subgenre** field as Layer 0 / top-of-form | Single highest-signal input; lets us defer/filter downstream |
| A2 | Add **3–5 Presets** ("Start from Cradle-like / DCC / Cozy / Regression / Blank") | Fixes cold-start problem; demonstrates the system |
| A3 | Split **Archetype** into `protagonistRole` + `protagonistClass` | Matches how the genre actually classifies MCs |
| A4 | Add **protagonistOrigin** field (native / isekai / regression / transmigration / reincarnation / etc.) | Shapes knowledge advantage + tone baseline |
| A5 | Split tone into **Seriousness × Optimism** 2D | More expressive, same click budget |
| A6 | Extract LAYERS data into `src/data/` | Unblocks everything that follows without ceremony |

### Tier B — foundational for Phases 4–7

| # | Change | Why |
|---|--------|-----|
| B1 | Finish Phase-1 migration: add `description` + `tags` to *all* options | Prompt quality + tag-reorder depend on it |
| B2 | Build tag taxonomy file + validate on load | Keeps taxonomy coherent as we grow |
| B3 | Implement **Coherence chip panel** | Live authorial feedback at every click |
| B4 | Implement **"Fill the rest with me"** (roadmap Phase 7) | The killer differentiator vs. generic form |
| B5 | Implement **soft reorder** of options by tag-overlap (roadmap 4b) | Makes dynamism feel alive |
| B6 | Add **conditional fields** / `visibleWhen(selections)` (roadmap 4c) | Cuts perceived complexity in half for cozy / dungeon-core |

### Tier C — progression-specific depth (big payoff for core audience)

| # | Change | Why |
|---|--------|-----|
| C1 | Add **progressionLadder** (rungs + bookOneEndTier) | Genre-defining feature currently missing |
| C2 | Add **cheatFactor** dial | Huge fraction of the genre hinges on this |
| C3 | Add **companionStructure** field (solo / party / guild / harem / family) | Changes pacing fundamentally |
| C4 | Add **antiTheme** and expand theme list to 14 | Doubles expressive range with one field + 7 labels |

### Tier D — output & sharing

| # | Change | Why |
|---|--------|-----|
| D1 | URL-encode selections → share link | Free once implemented |
| D2 | Beat re-roll (range-first) | Removes "regenerate everything" friction while preserving coherence |
| D3 | Named presets (save/load multiple) | Graduates from last-used to a small library |
| D4 | Export as Markdown / plain text | Current copy-to-clipboard is rough |

### Tier E — community & platform

- E1 Genre packs architecture (§4.2) — once we have 2 packs, formalize
- E2 Contribution docs for option-bank edits
- E3 (Maybe) Opt-in anonymous telemetry: which options are picked most,
  which combos trigger which warnings, which get abandoned before Generate

---

## 6. Decisions (Resolved)

1. **Subgenre requirement:** `subgenre` is **required** with a
  **"Genre-agnostic"** option.

2. **Preset override model:** when subgenre changes after preset load, use
  **confirm + replace conflicting fields**.

3. **Coherence display:** **qualitative first**, with optional numeric detail
  in a tooltip.

4. **Tag governance:** maintain a **strict allow-list in `tags.js`**.

5. **"Fill the rest with me" v1:** ship **single-shot** completion first.

6. **Archetype split migration:** perform **heuristic auto-migration** and
  show a review warning so users can adjust.

7. **Progression ladder scope:** ship with **3–4 presets + custom rungs**.

8. **Beat reroll scope:** prioritize **range reroll** in v1
  (e.g., "keep beats 1–5, redo 6–15").

---

## 7. Suggested next sprint

Scoped to preserve momentum without biting off too much:

1. **A6** — extract LAYERS data into `src/data/` (pure refactor; zero-risk)
2. **A1 + A2** — add `subgenre` field + 3 presets (Cradle-like / DCC-like /
   Blank) with preset-load and preset-save
3. **A5** — split tone into 2 axes
4. **B1** — pass through every option bank, add `description` + `tags`
5. **Tests** — unit coverage for preset loading, tag-based filter, tone
   2D selection

Everything in Tier A would meaningfully change user experience within a
sprint. Tier B is the next sprint. Tier C slots in when we have ~2 weeks
uninterrupted or have a user asking for it.

---

## 8. Anti-recommendations (what we should *not* do)

- **Don't build a typed schema migration tool yet.** Premature. Our 35 fields
  can be hand-migrated. Revisit at 100+.
- **Don't add user accounts.** A hashable URL + localStorage covers 90% of
  sharing needs for free.
- **Don't try to support non-LitRPG genres.** The framework's genre-specificity
  is a feature, not a bug. The *beat map* logic is genre-agnostic (Save the
  Cat), but the option banks aren't — and that's correct.
- **Don't add realtime collaboration.** Three-order-of-magnitude jump in
  complexity for a tool one person uses for 20 minutes.
- **Don't make the preset list editable by default.** Presets are curated
  starting points. If users want to save their own, that's a *named seed* (D3),
  not a preset.
