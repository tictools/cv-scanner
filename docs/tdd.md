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

## Open item: test framework

No test runner is installed yet — `package.json`'s `test` script is still the placeholder from
scaffolding. Picking one (e.g. Vitest, given the Node + TypeScript + ESM stack) is an open
decision for whichever module is implemented first; update this section once it's chosen so the
next module reuses it instead of re-deciding. The mandatory-TDD rule holds regardless of which
runner ends up in `package.json`.

## Exceptions

Same spirit as the OpenSpec exception in `AGENTS.md` §5: trivial fixes, exploratory spikes, and
tooling/config changes that touch no `src/` behavior don't need a test written first. Anything
that changes what a module *does* does.
