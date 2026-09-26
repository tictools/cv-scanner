# Test-Driven Development

**TDD is mandatory for any module behavior implemented under `src/`.** No production code gets
written before there is a failing test that requires it.

## The cycle

For every unit of behavior (a function, an endpoint, a chunking rule, a prompt-assembly step):

1. **Red** — write a test that expresses the behavior and watch it fail for the right reason
   (the behavior doesn't exist yet, not a typo or a broken test setup).
2. **Green** — write the minimum implementation needed to make that test pass. Resist adding
   anything the current test doesn't demand.
3. **Refactor** — clean up implementation and test alike (naming, duplication, structure) with
   the safety net of the passing test, then move to the next behavior.

This applies at the unit level inside each module (`feed`, `rag`, `agent`, `app`) — not only at
the end of a module via a handful of end-to-end checks. A module is done when its behaviors were
each driven out this way, not when someone writes tests afterward to cover code that already
exists.

## How this fits the OpenSpec workflow

[AGENTS.md §5](../AGENTS.md#5-working-agreements) defaults implementation work to an OpenSpec
proposal before code. When a proposal's `tasks.md` breaks a module's behavior into tasks, each
task that touches `src/` must be sequenced as **write the failing test → make it pass**, not as a
single "implement X" line — the spec describes *what*, TDD governs *how* it gets built. A task
that can't be phrased that way (e.g. a pure config/tooling change) isn't module behavior and
falls under the same exception already carved out for OpenSpec itself.

## Test framework: Vitest

Chosen when implementing `feed` (the first module built): first-class TypeScript + ESM support,
jest-like API, fast watch mode for the red-green loop. Rejected `node:test` (needs a TS
loader/transpile step, more mocking boilerplate) and Jest (heavier, historically clunky ESM
support) — see `openspec/changes/add-cv-generation/design.md` decision 10 for the full rationale.
Run it with `pnpm test` (`vitest run`); `vitest.config.ts` resolves the same `@feed/*`-style path
aliases declared in `tsconfig.json` (per `docs/architecture.md` §3), so the next module reuses
this setup instead of re-deciding it.

## Exceptions

Same spirit as the OpenSpec exception in `AGENTS.md` §5: trivial fixes, exploratory spikes, and
tooling/config changes that touch no `src/` behavior don't need a test written first. Anything
that changes what a module *does* does.
