# Plot Generator — Roadmap & Design Notes

Living design doc for the LitRPG / Progression Fantasy story seed generator.
Ordered roughly by dependency: earlier phases unlock later ones.

---

## Guiding Principles

1. **Structure is data, not code.** Validation rules, compatibility, and option metadata should live on the data so we can add/edit without touching logic.
2. **The form is a conversation, not a survey.** Earlier choices should reshape later ones — grey out, reorder, re-rank.
3. **The LLM is a co-author, not a finisher.** It should help *during* selection (expanding options, suggesting defaults), not only at the final "Generate" button.
4. **Every token to the model has to earn its place.** Prefer sectioned prose + descriptions over raw JSON dumps of labels.
5. **Progressive disclosure.** Core experience stays fast; depth hides behind advanced/collapsible panels.

---

## Current State (MVP)

- 8 layers, ~30 flat `string[]` dropdowns
- Validation: 7 hardcoded rules in `validate()`
- Prompt: `JSON.stringify(selections)` in `buildGenerationPrompt`
- Providers: Anthropic (sk-ant-) + OpenAI (sk-/sk-proj-) auto-detected
- Dev-only Vite plugin for `/api/last-selection`, `/api/selection-history`, `/api/default-api-key` — localStorage fallback works in prod
- Deployed via GitHub Actions → Pages at `https://soupyofficial.github.io/plot_generator/`

---

## Phase 1 — Option metadata upgrade *(foundation)*

**Goal:** Replace `options: string[]` with `options: Option[]` where:

```js
type Option = {
  value: string;           // canonical label, still the stored value
  description?: string;    // 1-sentence hover / LLM context
  tags?: string[];         // e.g. ["distrust", "puzzle-friendly"]
  implies?: Record<FieldId, string | string[]>;    // soft suggestion
  forbids?: Record<FieldId, string | string[]>;    // hard incompatibility
  requires?: Record<FieldId, string | string[]>;   // hard prerequisite
};
```

Back-compat shim: `normalizeOption(opt)` accepts `string | Option` and returns `Option`. Means we can migrate one field at a time.

**Unlocks:** tooltips, data-driven validation (Phase 3), dynamic filtering (Phase 4), richer prompts (Phase 2).

---

## Phase 2 — Structured prompt + freeform user input

Replace the JSON dump in `buildGenerationPrompt` with a sectioned brief:

```
# LOCKED STRUCTURAL CHOICES

## Macro — World
- Integration: {value} — {description}
- Scale: {value} — {description}
...

## Macro — Ending (LOCKED; all 15 beats must converge here)
- Resolution mode: {value} — {description}
- Protagonist outcome: {value}

## Protagonist
- Archetype: {value} — {description}
- Wound: {...}      ← Phase 4 addition
- Lie believed: {...}

## Central Tension
- Theme: {theme}
- Argument: "{themeQuestion}"
- Anti-theme: {antiTheme}   ← Phase 4 addition

# HIGH-VALUE COMBOS DETECTED
{if any `highValueCombos` from system_story_data match, include commentary}

# ACTIVE CONSTRAINTS
{validation results, stated as requirements the LLM must honor}

# USER NOTES (optional, verbatim)
{freeform textarea content}
```

**Free wins in this phase:**
- Add a single "Anything else you want included or avoided?" textarea above the Generate button — passed verbatim as `# USER NOTES`.
- Include detected `highValueCombos` commentary from `system_story_data.js` (already written, unused).

---

## Phase 3 — Data-driven validation

Delete the 7 hardcoded rules in `validate()`. Replace with:

```js
function validate(selections) {
  const warnings = [];
  for (const [fieldId, value] of Object.entries(selections)) {
    const opt = findOption(fieldId, value);
    if (!opt) continue;
    for (const [otherField, bad] of Object.entries(opt.forbids ?? {})) {
      if (matches(selections[otherField], bad)) {
        warnings.push({
          severity: "hard",
          fields: [fieldId, otherField],
          message: `${fieldId}=${value} is incompatible with ${otherField}=${selections[otherField]}`,
          explanation: opt.description, // or explicit `forbids[otherField].reason`
        });
      }
    }
  }
  // Plus a small set of cross-cutting rules that don't fit the option model
  // (e.g. subplot count 2–4, at-least-one-theme-selected).
  return warnings;
}
```

UI: warnings become clickable chips with an "explain" expand showing the `story_anatomy.docx` rule text.

**Migration risk:** the 7 existing rules need to be decomposed into option-level `forbids`. Some (Entertainment+Defier, Exposure+SingleLateReveal) are trivially a 1:1. A few are conditional on multiple fields and stay as cross-cutting rules.

---

## Phase 4 — Dynamic options (selection → available choices)

This is the big dynamism payoff. Three behaviors layered together:

**4a. Hard filter (forbids):** if the user picks `world.systemOrigin=Divine`, options in other fields that `forbids: { systemOrigin: "Divine" }` are rendered with `disabled` + tooltip "Incompatible with Divine origin system".

**4b. Soft reorder (implies + tags):** options whose `tags` overlap the currently-selected options' `tags` float to the top with a subtle highlight. Example: picking a "distrust"-tagged `systemVisibility: Unreliable` boosts "distrust"-tagged theme options.

**4c. Conditional fields:** some fields only appear when a prerequisite is set.
- `truthRevealPacing` only shown when `resolutionMode === "Exposure"`
- `trainingMontageRatio` only when `progressionMechanic !== "Inherent/Innate"`

Implementation: a `visibleWhen(selections)` predicate on each component.

---

## Phase 5 — Advanced / optional questions

Each layer gets a collapsed `<details>` block "Advanced". New fields:

### Macro → System (advanced)
- **Cost currency**: time | sanity | relationships | stat-swap | memory | lifespan
- **Failure state severity**: reversible | permanent debuff | death | worse-than-death
- **Integration depth**: known-to-all | secret-society | protagonist-only

### Protagonist (advanced)
- **Wound**: the pre-story trauma driving behavior
- **Lie believed**: the false self-narrative
- **Want vs. Need split**: short textarea or structured pair

### Mid (advanced)
- **Training montage ratio**: percentage slider (0–40%)
- **Stakes escalation curve**: linear | geometric | plateau-then-spike

### Theme (advanced)
- **Anti-theme**: what the story argues *against*
- **Thematic refrain**: repeated line or image

### Series (advanced)
- **Cross-book antagonist continuity**: standalone | escalating-ladder | hydra-heads
- **Foreshadow budget**: how many book-1 seeds pay off later

All are `Option[]` from day one (benefits from Phase 1).

---

## Phase 6 — ✨ LLM-assisted option expansion

New button beside every dropdown: **✨ Suggest more**.

**Prompt template:**
```
You are extending a LitRPG story generator's option list for field:
  "{fieldId}: {fieldLabel}"

Current selections (for context):
{structured brief from Phase 2, minus final USER NOTES}

Existing options:
{value + description list}

Propose 4 NEW options that:
- are not paraphrases of existing ones
- are consistent with the user's current choices
- each include a 1-sentence description and 1–3 tags

Return strict JSON:
{ "options": [{ "value": "...", "description": "...", "tags": [...] }] }
```

**Behavior:**
- Merge into that field's dropdown with a ✨ prefix
- Persist in session (`sessionStorage`) so they survive re-renders but don't pollute long-term
- Optional: "Add to my library" button saves to `localStorage` to persist across visits

---

## Phase 7 — Collaborative "Deepen selection" mode

New button: **Fill the rest with me**.

Flow:
1. User locks 3–5 core fields (probably: theme, resolutionMode, archetype, primaryConflict).
2. LLM proposes values for *all remaining fields* with a 1-sentence rationale each.
3. User reviews in a side-by-side diff: current vs. suggested, field-by-field accept/reject.

**Prompt:** same structured brief (Phase 2) but with "LOCKED" fields marked and "PROPOSE" fields asked. Response is a JSON object of field→{value, rationale}.

Turns the tool from "fill 30 fields then generate" into "pick your pillars, collaborate on the rest."

---

## Phase 8 — Nice-to-haves (low-priority)

- **Randomize** button (weighted toward high-value combos)
- **Share link** (URL-encoded selections, e.g. base64 of selections object in hash)
- **Export** generated seed + beats as Markdown / PDF
- **Session history panel** using the existing `selection-history.json` mechanism (already exists; currently dev-only — either port to localStorage or just accept it's a local feature)
- **Beat re-roll**: regenerate a single beat without redoing all 15
- **Inline beat editing** + "keep this, redo that" flow

---

## Decisions (Resolved)

- ✅ **Subgenre is required**, with a **"Genre-agnostic"** option as bypass.
- ✅ **Preset switching behavior:** when subgenre changes after preset load, use **confirm + replace conflicting fields**.
- ✅ **Coherence indicator:** **qualitative labels** with **optional numeric tooltip**.
- ✅ **Tag governance:** **strict allow-list in `tags.js`** (new tags added intentionally via code review).
- ✅ **"Fill the rest with me" v1:** **single-shot** completion first.
- ✅ **Archetype split migration:** **heuristic auto-migrate + review warning** for legacy seeds.
- ✅ **Progression ladder scope:** **3–4 presets + custom rungs** in initial implementation.
- ✅ **Beat reroll scope (v1):** prioritize **range reroll** (e.g., keep beats 1–5, redo 6–15) over single-beat-only.

### Deferred implementation choices (next pass)

- ⏳ **Validation severity:** keep current warning behavior for now; revisit hard-blocking once more option metadata has `forbids` coverage.
- ⏳ **LLM option caching:** evaluate after telemetry from first `✨ Suggest more` rollout.
- ⏳ **Freeform notes granularity:** keep one global textarea in v1.
- ⏳ **Expansion model/provider strategy:** start with cost-efficient fast model; revisit if option quality is inconsistent.

---

## Suggested Roll-out Order

| Phase | Effort | Payoff | Blocks |
|-------|--------|--------|--------|
| 1. Option metadata upgrade | Medium | Foundation — unlocks 3, 4, 6 | 3, 4, 6 |
| 2. Structured prompt + freeform | Small | Immediate quality bump | none |
| 3. Data-driven validation | Medium | Cleaner, extensible rules | depends on 1 |
| 4. Dynamic options (filter/reorder/conditional) | Medium | **The thing the user asked for** | depends on 1 |
| 5. Advanced / optional questions | Small per field | Depth | benefits from 1 |
| 6. ✨ Suggest more options | Small | Feels magical | depends on 1 |
| 7. Deepen selection (collaborative fill) | Larger | New workflow | depends on 2 |
| 8. Nice-to-haves | Varies | Polish | none |

**Recommended first sprint:** 1 + 2 + 4a (hard-filter only). That gives the user the dynamic-filtering behavior they asked for, with the foundation that makes everything else cheap.

---

## Non-goals (for now)

- Multi-user accounts / cloud sync
- Full fine-tuning or custom model hosting
- Non-LitRPG genres — the framework is genre-specific and that's a feature
- Mobile-first redesign — desktop primary, mobile must work but not shine
