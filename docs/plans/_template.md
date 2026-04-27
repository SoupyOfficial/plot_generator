<!--
  PLAN TEMPLATE — copy this file to docs/plans/<kebab-slug>.md and fill in.
  One template, three tiers. Pick a tier in the frontmatter and use only that tier's body sections.
  Conventions:
    - Frontmatter is identical across tiers (downstream tools depend on it).
    - Steps use `- [ ]` checkboxes so the executor can flip them to `- [x]` in place.
    - Cross-plan references are relative markdown links: [parent](../<slug>.md).
-->
---
id: <kebab-slug>            # must match filename without .md
tier: epic | feature | task # pick one
status: draft               # draft | ready | in-progress | done | abandoned
parent:                     # optional: id of the parent plan (epic for a feature, feature for a task)
created: YYYY-MM-DD
owner:                      # optional: human or agent name
---

# <Plan title>

<!-- One-sentence elevator pitch. What changes for the user/system when this is done. -->

---

## ────────────  EPIC tier  ────────────
<!-- DELETE this whole section if tier is not `epic`. -->

### Vision
<!-- 2-4 sentences. What does the world look like when this epic is shipped? Why now? -->

### Success metrics
<!-- Observable, measurable. Numbers if possible; behaviors if not. -->
- <metric> — current: <x>, target: <y>, measured by: <how>

### Milestones
<!-- 3-6 milestones, each linked to a `feature` plan. Order = execution order. -->
1. **<milestone name>** — [plan](./<epic-slug>/<feature-slug>.md) — status: draft
2. **<milestone name>** — [plan](./<epic-slug>/<feature-slug>.md) — status: not-started

### Non-goals
<!-- Explicitly out of scope. Prevents scope creep across the child plans. -->
- <non-goal>

### Risks
- **<risk>** — likelihood: low|med|high — detection: <signal that tells us it's happening>

---

## ────────────  FEATURE tier  ────────────
<!-- DELETE this whole section if tier is not `feature`. -->

### Problem
<!-- Who feels what pain today? What evidence? -->

### Solution sketch
<!-- 1-2 paragraphs. Approach, not implementation. Mention key modules and any new ones. -->

### Affected modules
<!-- Bullet list with one-liner per module describing the change. -->
- [`src/lib/<file>.js`](../../src/lib/<file>.js) — <what changes>
- [`src/components/<file>.jsx`](../../src/components/<file>.jsx) — <what changes>

### Tasks
<!-- 3-8 tasks. Each is either an inline checklist OR a link to a `task` plan for larger work. -->
1. [ ] **<task name>** — see [plan](./<feature-slug>/<task-slug>.md) *(or inline below)*
2. [ ] **<task name>**
   - Files: `<path>`
   - Verification: `npx vitest run <path>`

### Acceptance criteria
<!-- The feature is done when ALL of these are true and verifiable. -->
- [ ] <criterion> — verified by: <test name | command | observable>
- [ ] <criterion> — verified by: <…>

### Risks
- **<risk>** — mitigation: <plan> — detection: <signal>

### Out of scope
- <thing this feature explicitly does not do>

---

## ────────────  TASK tier  ────────────
<!-- DELETE this whole section if tier is not `task`. -->

### Goal
<!-- One sentence. What's true after this task that isn't true now. -->

### Context
<!-- Files the executor needs open. Link them. Add a one-line "why this file matters". -->
- [`<path>`](../../<path>) — <relevance>
- [`<path>`](../../<path>) — <relevance>

### Steps
<!-- Atomic, ordered, each touches named files and has verification. Executor flips [ ] → [x]. -->
- [ ] **S1.** <action> in [`<path>`](../../<path>)
  - Verification: `npx vitest run src/lib/__tests__/<file>.test.js`
- [ ] **S2.** <action> in [`<path>`](../../<path>)
  - Depends-on: S1
  - Verification: <command or observable>
- [ ] **S3.** <action>
  - Verification: <…>

### Acceptance criteria
- [ ] <criterion> — verified by: <test or command>
- [ ] No regressions: `npx vitest run` is green

### Verification recipe
<!-- The exact commands the reviewer should run to independently confirm. -->
```sh
npx vitest run
# add scoped commands or e2e if relevant:
# npx playwright test tests/e2e/<spec>.spec.js
```

### Rollback
<!-- How to undo if this turns out to be wrong. "Revert commit X" is fine for small tasks. -->
- <rollback steps>

### Risks
- **<risk>** — detection: <how we'd notice>

---

## Outcome
<!-- Filled in by the executor when status flips to `done`. Empty until then. -->
- **Shipped:** <what>
- **Diverged from plan:** <any deltas + why>
- **Follow-ups:** <new tasks/issues this surfaced>

## Review
<!-- Filled in by the reviewer prompt. Empty until then. -->
