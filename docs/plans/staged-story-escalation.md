---
id: staged-story-escalation
tier: epic
status: draft
parent:
created: 2026-04-27
owner: GitHub Copilot
---

# Staged Story Escalation with Multi-Project Persistence

Transform the plot generator from a one-shot "selections → chapters" pipeline into a collaborative escalation ladder where users iterate through progressively larger story artifacts — seed → promise → short story → novella outline → novel outline → chapters — with each stage serving as consistency anchor and canon for the next.

---

## ────────────  EPIC tier  ────────────

### Vision

Today, the generator takes a completed form and immediately jumps to multi-chapter prose generation. Users can't inspect or approve the story's premise, voice, or outline before committing to expensive LLM calls. The prose often drifts in tone or contradicts setup because there's no locked consistency anchor.

When this epic ships, users will work through six staged levels: L1 Seed (one paragraph premise), L2 Promise (protagonist/want/obstacle/stakes), L3 Short Story (1.5–3k word complete narrative that establishes voice and character), L4 Novella Outline (5–7 chapters), L5 Novel Outline (15–30 chapters), and L6 Chapter Prose (existing flow, now canon-aware). Each level generates 3 candidates; the user picks one to lock as canon before advancing. Voice fingerprints extracted at L3 become the baseline for drift detection at every later stage. All artifacts persist to TursoDB with multi-project support and full CRUD. The entire experience runs in a single consolidated UI (StageFlow) that absorbs the current Wizard, PipelineCockpit, and manual editor into one cohesive flow with a stage rail, main artifact panel, and inspection drawer.

### Success metrics

- **Time to first approved prose** — current: ~2min (form fill → generate all chapters blind); target: ~5min to L3 short story lock (3 cheap iterations vs. committing blind), measured by: median session duration to first "lock" action in L3
- **Voice consistency** — current: no measurement; target: 85% of generated chapters score ≤0.15 drift vs L3 baseline, measured by: `voiceFingerprint.js` delta on all completed chapters
- **Iteration cost** — current: regenerating one bad chapter = full scaffold+prose+audit cycle (~15k tokens); target: regenerating one outline level = <5k tokens, measured by: mean token cost per stage regeneration logged in Turso
- **User engagement with staged flow** — target: ≥60% of new projects lock a short story before advancing to chapters, measured by: `stages` table row count per project
- **Multi-project adoption** — target: ≥40% of users create >1 project within first session, measured by: `projects` table row count per distinct browser fingerprint (localStorage fallback)

### Milestones

1. **Storage abstraction & Turso integration** — [plan](./staged-story-escalation/storage-layer.md) — status: done
   - Multi-adapter storage interface (`memory`, `libsql`, `server` stub)
   - SQL schema with migrations (drizzle-kit)
   - Multi-project CRUD primitives
   - Test suite runs against both memory and `:memory:` libsql
   - `.env.example` with Turso credentials

2. **UI consolidation to StageFlow** — [plan](./staged-story-escalation/stageflow-shell.md) — status: not-started
   - Single-page shell: project picker bar (top), stage rail (left), main panel (center), inspection drawer (bottom)
   - Full project CRUD UI: list / create / rename / delete / duplicate
   - Stage rail shows status dots: `fresh` | `stale` | `locked`
   - Inspection drawer tabs: CANON · AUDIT · HISTORY · RAW (read-only) · REVERSE
   - Migrate Wizard components into L1/L2 stage panels (no behavior change)
   - Migrate PipelineCockpit tabs into inspection drawer
   - Delete old `App.jsx` standalone editor and unused `wizard.jsx` shell
   - All existing tests green

3. **L1 Seed & L2 Promise stages with branching** — [plan](./staged-story-escalation/seed-promise-stages.md) — status: not-started
   - `src/lib/seed.js` + `promise.js` generators (pure functions, LLM-backed)
   - Generate 3 candidates per stage, pick-to-lock UI
   - Stage-specific optional input fields (tone lean, stakes magnitude, ending shape)
   - Canon freezing at L2 lock: `{ premise, genre, tone, protagonist, want, obstacle, stakes, irony, endingShape }`
   - Live/fixture toggle: `VITE_LLM_LIVE=1` env + per-stage UI checkbox
   - Keep all candidates in DB with `picked` flag
   - Tests with fixture fallback

4. **L3 Short Story stage with voice fingerprinting** — [plan](./staged-story-escalation/short-story-voice.md) — status: not-started
   - `shortStory.js` generator using locked L1+L2 canon
   - Inline prose editor (hand-tweak before locking)
   - Dual voice fingerprint extraction at lock:
     - Algorithmic: sentence stats, lexical diversity, register, signature n-grams
     - LLM-described: 2–3 sentence prose description
   - Both append to canon and freeze
   - Fingerprint re-extraction at every later stage with drift scoring vs L3 baseline
   - Drift >threshold → amber dot on stage rail + flag in AUDIT tab (non-blocking)
   - Tests for both extraction methods

5. **L4 Novella & L5 Novel Outline stages with canon validation** — [plan](./staged-story-escalation/outline-stages.md) — status: not-started
   - `novellaOutline.js`: expand L3 beats into 5–7 chapter summaries with setup/payoff tags
   - `novelOutline.js`: expand novella into 15–30 chapters, threading subplots
   - Canon-validator runs before lock: flags drift, forces accept-or-revise
   - Character ledger auto-extracted from L3, editable, enforced at L4+
   - Promise contract auditor: verify every L2 promise has a payoff beat in L5
   - Setup/payoff graph visualization (optional, in HISTORY tab)
   - Tests for validation rules

6. **Integration: stale propagation & chapter flow plumbing** — [plan](./staged-story-escalation/integration.md) — status: not-started
   - Editing any locked stage marks all downstream stages `stale`
   - Per-stage "rebuild" button in rail; no auto-cascade
   - Existing scaffold/prose/audit flow (L6 chapters) now receives `contract.canon` so audits compare against voice fingerprint, character ledger, and setup/payoff graph
   - CHAPTERS tab (already built) shows `fresh`/`stale`/`locked` per row
   - End-to-end test: L1 → L6 full ladder with one edit at L3 causing stale propagation to L4/L5/L6
   - Migration script: seed existing localStorage projects into Turso schema
   - All 306+ tests green

### Non-goals

- **Branching within a stage (git-style)** — candidates yes, but not multiple parallel timelines. Out of scope for epic; revisit after v1 ships.
- **Real-time collaboration / multiplayer editing** — single-user, single-tab for now. Storage layer is ready for it but UI isn't.
- **Automated cascade regeneration** — always mark stale, never auto-regenerate. User decides when to rebuild.
- **Voice fingerprint training/fine-tuning** — extraction + drift detection only. No prompt optimization loop to "learn" the user's preferred voice.
- **Export to .epub / .mobi / publishing formats** — Markdown + JSON only. Publishing toolchain is a separate epic.
- **Undo/redo stack** — versioned stages give you history, but no ctrl+Z within a stage's inline editor. Can add later.

### Risks

- **Drizzle-kit migration churn on schema iteration** — likelihood: medium — detection: >3 migration files created in first 2 weeks, manual schema diffs growing — mitigation: lock schema in milestone 1 with a full walkthrough of all six stages' data needs before writing the first migration
- **Stale propagation becomes naggy** — likelihood: medium — detection: user feedback "too many stale dots", analytics show <10% of stale stages ever rebuilt — mitigation: make stale state calm (no banners, just rail dots + optional rebuild); add "accept staleness and lock anyway" button
- **Voice drift threshold too strict** — likelihood: high — detection: >50% of L4+ stages flagged amber, user complaints — mitigation: expose threshold as a per-project setting (default 0.15, range 0.1–0.3); log actual drift distributions and tune default based on data
- **L3 short story generation too slow/expensive for iteration** — likelihood: medium — detection: >30sec median L3 generation time, >$0.10 per candidate — mitigation: add word-count target slider (default 2k, range 1k–3k); use cheaper model for L1/L2/L3 (Claude Haiku tier) and promote to Sonnet only at L4+
- **Turso cold-start latency** — likelihood: low — detection: >2sec median for first DB read on page load — mitigation: preconnect hint in index.html, fall back to memory adapter with "reconnecting…" banner if libsql client times out
- **Existing wizard users resist new flow** — likelihood: medium — detection: bounce rate spike post-deploy, support requests "where's the old form" — mitigation: ship both flows side-by-side behind `?legacy=1` flag for 2 weeks, A/B test engagement, deprecate based on data
