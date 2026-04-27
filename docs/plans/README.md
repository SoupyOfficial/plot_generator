# Plans

Structured plan documents that drive the **planner → executor → reviewer** workflow.

## The loop

```text
/plan <goal>            ← produces a plan doc here (drafts the contract)
   ↓
/execute path=<plan>    ← implements the plan, flips [ ] → [x], runs vitest
   ↓
/review path=<plan>     ← independently verifies, appends ## Review section
```

All three commands read and mutate the **same plan doc**. The plan is the single source of truth for what was promised, what shipped, and what's left.

## Tiers

One template ([`_template.md`](./_template.md)), three granularities — pick the smallest tier that fits.

| Tier | Scope | Typical step count | Lives where |
|------|-------|--------------------|-------------|
| `epic` | Multi-feature initiative, weeks of work | 3-6 milestones, each linking to a `feature` | `docs/plans/<epic-slug>.md` |
| `feature` | One coherent capability, days, multi-file | 3-8 tasks, can link to `task` plans | `docs/plans/<epic-slug>/<feature-slug>.md` |
| `task` | One PR / sitting | ≤ ~10 atomic steps | `docs/plans/<...>/<task-slug>.md` or top-level for one-offs |

Child plans nest under a folder named after the parent slug. Set `parent:` in frontmatter to the parent's `id`.

## Frontmatter contract

Every plan, regardless of tier, has the same frontmatter so plans are greppable and tools can walk them:

```yaml
---
id: <kebab-slug>
tier: epic | feature | task
status: draft | ready | in-progress | done | abandoned
parent: <parent-id or empty>
created: YYYY-MM-DD
owner: <optional>
---
```

## Status transitions

```text
draft  ─(planner critique passes)→  ready
ready  ─(/execute starts)→         in-progress
in-progress  ─(all [x], tests green)→  done
in-progress  ─(deprioritized)→     abandoned
```

The executor will refuse to run a `draft` plan without explicit human confirmation.

## Authoring tips

- **Steps name files.** "Update logic" is a smell. "Add `validate()` to [`src/lib/contract.js`](../../src/lib/contract.js)" is a step.
- **Steps name verifications.** A test path, a command, an observable. If you can't say how to check it, you can't say it's done.
- **Link, don't inline.** When a task plan would bloat a feature plan past ~8 tasks, extract it.
- **Don't skip the risks section.** One named risk with a detection signal beats a paragraph of hedging.

## Related files

- [`_template.md`](./_template.md) — copy this to start a new plan
- [`.github/prompts/execute.prompt.md`](../../.github/prompts/execute.prompt.md)
- [`.github/prompts/review.prompt.md`](../../.github/prompts/review.prompt.md)
- [`.github/agents/plan-critic.agent.md`](../../.github/agents/plan-critic.agent.md)
- `plan.prompt.md` lives at the user-prompts level (roams across workspaces)
