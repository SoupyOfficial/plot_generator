---
id: seed-promise-stages
tier: feature
status: done
parent: staged-story-escalation
created: 2026-04-27
completed: 2025-01-10
owner: GitHub Copilot
---

# L1 Seed & L2 Promise Stages with Branching

Replace manual wizard field selection in L1/L2 with LLM-powered candidate generation (3 per stage), pick-to-lock workflow, and canon freezing that flows into L3+.

---

## ────────────  FEATURE tier  ────────────

### Problem

Currently, L1 Seed and L2 Promise panels (migrated from wizard steps in M2) require users to manually select from dropdown menus across 7 layers (macro, mid, subplot, protagonist, beats, micro, theme). This is slow, doesn't leverage the generator's storytelling intelligence, and forces users to make structural decisions before seeing the story's premise in prose. No iteration happens before L3—users commit blind to their manual picks.

When users do reach L3 Short Story, they often discover their L1/L2 choices don't align with the voice or tone they wanted. Fixing this means backing all the way up to L1, re-selecting fields, and regenerating everything downstream—an expensive, frustrating loop.

### Solution sketch

Transform L1/L2 from manual selection panels into **generator-driven branching stages**:

1. **Seed generator** (`src/lib/seed.js`): Takes existing wizard selections (preset, macro, mid, subplot, protagonist) as context and produces a 1-paragraph **premise** that crystallizes the story's hook, setting, and conflict. Returns 3 candidates with different tonal leans (e.g., darker/lighter/balanced). User picks one to lock.

2. **Promise generator** (`src/lib/promise.js`): Takes locked seed premise + L2 layer selections (beats, micro, theme) as context and produces a **story promise** (protagonist, want, obstacle, stakes, irony, ending shape). Again generates 3 candidates with variations in stakes magnitude and resolution arc. User picks one to lock.

3. **Pick-to-lock UI**: Each panel shows a candidate browser with 3 cards. User clicks one to select, then hits "Lock & Advance" to freeze the chosen artifact as canon and mark the stage `locked`. Locked artifacts feed into downstream stages (L3-L6) as the consistency anchor.

4. **Canon freezing**: When L2 locks, the `canonPremise` and `canonPromise` facets are written to storage with `{ premise, genre, tone, protagonist, want, obstacle, stakes, irony, endingShape }`. L3+ generators receive this canon object as read-only context.

5. **Optional input fields**: Both L1 and L2 panels get toggleable "Advanced Options" sections:
   - **L1**: `toneLean` (darker, lighter, balanced — guides seed generation)
   - **L2**: `stakesMagnitude` (low, medium, high), `endingShape` (hopeful, bittersweet, tragic)
   - These inputs influence candidate generation but don't block it—defaults apply if unset.

6. **Live/fixture toggle**: Add `VITE_LLM_LIVE=1` env var + per-panel UI checkbox "🔴 LIVE LLM" (defaults to off). When off, generators return pre-seeded fixture candidates from the test database. When on, calls real LLM API.

Storage already has `candidates` table and `saveCandidate`/`getCandidates`/`pickCandidate` methods (M1 deliverable). UI integration is the primary work.

### Affected modules

- [`src/lib/seed.js`](../../src/lib/seed.js) — **NEW** — Pure function: `generateSeedCandidates(selections, { toneLean, apiKey, useLive })` → returns `Promise<[{ artifact, generatedAt }, ...]>`
- [`src/lib/promise.js`](../../src/lib/promise.js) — **NEW** — Pure function: `generatePromiseCandidates(seed, selections, { stakesMagnitude, endingShape, apiKey, useLive })` → returns 3 promise candidates
- [`src/components/stages/l1Seed.jsx`](../../src/components/stages/l1Seed.jsx) — Add candidate generation button, candidate browser UI, lock workflow (current wizard fields stay for manual fallback mode)
- [`src/components/stages/l2Promise.jsx`](../../src/components/stages/l2Promise.jsx) — Same pattern as L1, load locked seed from canon
- [`src/lib/storage/memory.js`](../../src/lib/storage/memory.js) — Add `lockStage(projectId, stageKey, artifact)` convenience method (wraps `saveStage` + `saveCanonFacet`)
- [`src/lib/storage/libsql.js`](../../src/lib/storage/libsql.js) — Same `lockStage` implementation
- [`src/lib/storage/server.js`](../../src/lib/storage/server.js) — Stub `lockStage` (same pattern as other methods)
- [`src/lib/__tests__/seed.test.js`](../../src/lib/__tests__/seed.test.js) — **NEW** — Unit tests for generator with database fixtures
- [`src/lib/__tests__/promise.test.js`](../../src/lib/__tests__/promise.test.js) — **NEW** — Unit tests for promise generator
- [`src/components/__tests__/l1Seed.test.jsx`](../../src/components/__tests__/l1Seed.test.jsx) — **NEW** — UI tests for candidate generation and picking
- [`src/components/__tests__/l2Promise.test.jsx`](../../src/components/__tests__/l2Promise.test.jsx) — **NEW** — UI tests for L2 panel
- [`tests/e2e/seed-promise-flow.spec.js`](../../tests/e2e/seed-promise-flow.spec.js) — **NEW** — E2E test: full L1 → L2 → lock flow with fixture mode
- [`.env.example`](../../.env.example) — Add `VITE_LLM_LIVE=0` with documentation

### Tasks

1. [x] **Create seed.js generator module**
   - Files: `src/lib/seed.js` (new)
   - Logic: 
     - `generateSeedCandidates(selections, opts)` — accepts wizard selections (preset, macro, mid, subplot, protagonist), optional `toneLean` hint
     - Builds structured prompt from selections (reuse `buildStructuredBrief` from `prompt.js` pattern)
     - If `opts.useLive === false`, queries in-memory candidates table for pre-seeded fixtures matching projectId (test DB seed required)
     - If `opts.useLive === true`, calls LLM API (Anthropic/OpenAI via `llmPing.js` pattern) with max_tokens=150-200
     - Returns array of 3 `{ artifact: { premise, genre, tone }, generatedAt }` objects
   - Verification: `npx vitest run src/lib/__tests__/seed.test.js`

2. [x] **Create promise.js generator module**
   - Files: `src/lib/promise.js` (new)
   - Logic:
     - `generatePromiseCandidates(seed, selections, opts)` — accepts locked seed artifact, L2 selections (beats, micro, theme), optional `stakesMagnitude`/`endingShape` hints
     - Builds prompt with seed premise + L2 context
     - Same live/fixture toggle pattern as seed
     - Returns 3 `{ artifact: { protagonist, want, obstacle, stakes, irony, endingShape }, generatedAt }` objects
   - Verification: `npx vitest run src/lib/__tests__/promise.test.js`

3. [x] **Add lockStage() method to storage adapters**
   - Files: `src/lib/storage/memory.js`, `src/lib/storage/libsql.js`, `src/lib/storage/server.js`
   - Logic:
     - `lockStage(projectId, stageKey, artifact)` — convenience wrapper
     - Saves artifact to stage table with `status: 'locked'`, `lockedAt: new Date()`
     - If `stageKey === 'seed'`, also writes `canonPremise` facet (`{ premise, genre, tone }`)
     - If `stageKey === 'promise'`, writes `canonPromise` facet (`{ protagonist, want, obstacle, stakes, irony, endingShape }`)
     - Returns saved stage record
   - Verification: `npx vitest run src/lib/storage/__tests__/interface.test.js --grep lockStage`

4. [x] **Enhance L1 Seed panel with candidate generation UI**
   - Files: `src/components/stages/l1Seed.jsx`
   - UI changes:
     - Add "Advanced Options" collapsible section above layers with `toneLean` dropdown (darker/lighter/balanced) + "🔴 LIVE LLM" checkbox (defaults off)
     - Add "Generate Seed Candidates" button below preset picker (loads `generateSeedCandidates()` with current selections + toneLean)
     - Add candidate browser: 3-card grid showing `premise` text, genre/tone tags, generated timestamp
     - Add "Pick" button per card → calls `storage.pickCandidate(id)`, highlights picked card
     - Add "Lock & Advance to L2" button (enabled only when a candidate is picked) → calls `storage.lockStage(projectId, 'seed', artifact)`, shows success toast, switches to L2 stage
   - State: Track `candidates` array, `selectedCandidateId`, `generating` loading flag
   - Verification: `npx vitest run src/components/__tests__/l1Seed.test.jsx`

5. [x] **Enhance L2 Promise panel with candidate generation UI**
   - Files: `src/components/stages/l2Promise.jsx`
   - Same pattern as L1, but:
     - Load locked seed from `storage.getCanon(projectId, 'premise')` on mount
     - Pass seed to `generatePromiseCandidates()`
     - Candidate cards show protagonist/want/obstacle summary
     - Lock button writes both `canonPremise` (if not already set) and `canonPromise` facets
   - Verification: `npx vitest run src/components/__tests__/l2Promise.test.jsx`

6. [x] **Seed test database with fixture candidates**
   - Files: `src/lib/storage/__tests__/fixtures.js` (new helper)
   - Logic:
     - Export `seedFixtureCandidates(storage, projectId)` async function
     - Pre-inserts 3 seed candidates and 3 promise candidates with hardcoded artifact data (e.g., "Dark fantasy premise", "Light hopeful premise", "Balanced mystery premise")
     - Called in `beforeEach` of seed.test.js, promise.test.js, L1/L2 component tests
   - Verification: Tests pass without requiring real LLM API key

7. [x] **Add E2E test for full seed-promise flow**
   - Files: `tests/e2e/seed-promise-flow.spec.js` (new)
   - Playwright test:
     1. Launch app, switch to StageFlow mode
     2. Create project "Test Story"
     3. Navigate to L1 Seed
     4. Click "Generate Seed Candidates" (fixture mode)
     5. Pick second candidate
     6. Click "Lock & Advance to L2"
     7. Verify L2 Promise panel loads with seed context
     8. Generate promise candidates
     9. Pick one, lock
     10. Verify canon facets written to storage (query via `storage.getCanon(projectId, 'premise')` and `storage.getCanon(projectId, 'promise')`)
   - Verification: `npx playwright test tests/e2e/seed-promise-flow.spec.js`

8. [x] **Update .env.example with VITE_LLM_LIVE flag**
   - Files: `.env.example`
   - Add:
     ```
     # LLM Generator Toggle (M3+)
     # 0 = fixture mode (returns pre-seeded candidates from test DB)
     # 1 = live mode (calls real Anthropic/OpenAI API, requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
     VITE_LLM_LIVE=0
     
     # API Keys (only required if VITE_LLM_LIVE=1)
     VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
     VITE_OPENAI_API_KEY=sk-proj-...
     ```
   - Verification: Manual check — copy to `.env`, set `VITE_LLM_LIVE=1`, confirm live API call (check network tab for anthropic.com or openai.com requests)

### Acceptance criteria

- [ ] **Seed generator works** — verified by: `npx vitest run src/lib/__tests__/seed.test.js` (3/3 tests passing, fixture mode returns 3 candidates)
- [ ] **Promise generator works** — verified by: `npx vitest run src/lib/__tests__/promise.test.js` (3/3 tests passing)
- [ ] **L1 UI shows candidates** — verified by: Component test renders 3 cards after clicking "Generate Seed Candidates"
- [ ] **Picking a candidate persists** — verified by: Picked candidate has `picked: true` in storage after `pickCandidate()` call
- [ ] **Locking L1 writes canonPremise** — verified by: `storage.getCanon(projectId, 'premise')` returns `{ premise, genre, tone, lockedAt }` after lock
- [ ] **Locking L2 writes canonPromise** — verified by: `storage.getCanon(projectId, 'promise')` returns full promise contract after lock
- [ ] **E2E flow green** — verified by: `npx playwright test tests/e2e/seed-promise-flow.spec.js` passes
- [ ] **No regressions** — verified by: `npx vitest run` shows 397 baseline tests + new M3 tests all passing
- [ ] **Fixture mode works without API key** — verified by: Tests pass in CI without `VITE_ANTHROPIC_API_KEY` or `VITE_OPENAI_API_KEY` set
- [ ] **Live mode calls real API** — verified by: Manual test with `VITE_LLM_LIVE=1` + valid API key, network tab shows POST to anthropic.com/openai.com

### Risks

- **LLM cost spiral (MEDIUM)** — Generating 3 candidates per regeneration could rack up token costs if users spam the button. 
  - **Mitigation:** Add per-stage rate limit (max 5 generations per project per hour), show token cost estimate before generating.
  - **Detection:** Monitor `generatedAt` timestamps in `candidates` table; if median time-between-generations < 30s, add UI cooldown.

- **Fixture seed data drift (LOW)** — Pre-seeded fixture candidates might become stale as prompt templates evolve.
  - **Mitigation:** Store fixture data as JSON in `__tests__/fixtures/seed-candidates.json`, version it with a schema hash. Generator checks hash; if mismatch, regenerates fixtures in dev mode.
  - **Detection:** Tests fail with "Fixture schema mismatch" error when `seed.js` prompt template changes.

- **Canon overwrite on re-lock (MEDIUM)** — If user unlocks L2 and re-locks with different promise, downstream L3-L6 stages could go stale without notification.
  - **Mitigation:** M6 stale-propagation workflow will handle this (mark L3-L6 as `stale` when L1/L2 re-locks). For M3, document in plan that re-locking is allowed but downstream propagation is deferred.
  - **Detection:** Manual testing: lock L2, generate L3, unlock L2, lock different promise candidate, check L3 status (should show `stale` dot after M6 ships).

- **Optional fields ignored by LLM (LOW)** — `toneLean`, `stakesMagnitude`, `endingShape` hints might not influence output if prompt structure is weak.
  - **Mitigation:** Include A/B test fixtures in unit tests: same selections + different optional fields should produce visibly different candidate artifacts.
  - **Detection:** Compare `artifact.tone` field or `artifact.stakes` magnitude in test assertions. If identical across all 3 candidates despite different inputs, revise prompt.

### Out of scope

- **Inline editing of locked artifacts** — Once locked, seed/promise are frozen. Editing deferred to M7 (draft unlocking + re-locking workflow).
- **Candidate de-duplication** — If LLM returns similar candidates, no auto-merge. User picks from whatever is generated.
- **Voice fingerprinting** — That's L3's job (M4 milestone). Seed/Promise stages only establish plot structure, not prose style.
- **Multi-language LLM support** — English-only prompts and output. I18n deferred to M8+.
- **Prompt optimization loop** — No automatic re-prompting if candidates are low-quality. User can regenerate manually.
- **Token usage dashboard** — Logging LLM calls is out of scope; just pass through API responses. Observability is a separate epic.

---

## Outcome
<!-- Filled in by the executor when status flips to `done`. Empty until then. -->

## Review
<!-- Filled in by the reviewer prompt. Empty until then. -->
