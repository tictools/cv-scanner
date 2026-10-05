## Context

`src/agent/` works, but its exported names only make sense after opening the defining file (see
[proposal.md](proposal.md), issue #26). Current layout: `chat/` (Cloudflare adapter), `clients/`,
`env/`, `extraction/`, `orchestration/` (turn runner + helpers), `tools/`, plus `index.ts` (Worker
entry that `wrangler` points to). `app` imports `extractSources` and `SourceReference` from
`@agent/extraction/extract-sources`. This change touches `agent` and, for imports only, `app`.

## Goals / Non-Goals

**Goals:**
- Names that read clearly at the import site: `streamTurn`, `runTurn`, `extractScanCVSources`.
- One definition of the `scan-cv` tool name and of the tool-result filter.
- One catalog of exported types for `agent`.
- Zero runtime behavior change; tests moved/renamed, not rewritten.

**Non-Goals:**
- New behavior, new tools, prompt or step-limit changes.
- Adopting `types/` in `rag`/`feed`/`app`.

## Decisions

1. **`orchestration/` → `turn/`, with `streamTurn`/`runTurn`.** A turn (one user message in, one
   grounded answer out) is what both functions run. `compaction`, `system-prompt` and
   `groundedness-audit-log` only serve the turn, so they move in. `sharedCallConfig` becomes the
   exported `buildTurnConfig` in `turn/turn-config.ts`, next to `DEFAULT_MAX_STEPS`.
   *Alternatives:* `streamAnswer`/`generateAnswer` (hides the tool-calling step); `respond/` (a verb as
   a directory); keeping `streamAgent`/`runAgent` in `run/` (`Agent` repeats the module name and
   collides with the `ScannerAgent` class).

2. **`chat/` → `worker/`, not nested under `chat/`.** `chat/scanner-agent.ts` is the Cloudflare
   adapter, the only file importing `@cloudflare/ai-chat`. The turn runner is Cloudflare-free, so
   nesting it under the adapter would invert the dependency. `worker/` names the runtime boundary and
   matches `pnpm dev:agent`. *Alternatives:* `durable-object/` (verbose), `transport/` (suggests
   byte-moving only), `runtime/` (vague).

3. **Tool-scoped extractors.** `extraction/scan-cv-sources.ts` (`extractScanCVSources`) and
   `extraction/scan-cv-chunks.ts` (`extractScanCVChunks`, previously private in `query.ts`, now
   exported and tested). `SCAN_CV_TOOL_NAME` is exported from `tools/scan-cv.ts` and used by
   `tools/index.ts` and both extractors. `isScanCVResultItems` is shared by both. A future tool gets
   `extraction/<tool>-sources.ts`; a cross-tool aggregator would be `extractAllSources`.
   *Alternative:* keep one generic `extractSources` that dispatches by tool — rejected as premature
   with a single tool, and it hides the filter again.

4. **`types/` catalog, one file per scope, no barrel.** Files: `turn`, `tools`, `sources`, `chunks`,
   `env`, `clients`, `audit`. Only `type`/`interface` declarations; zod schemas and constants stay
   with their code (`ScanCVInput` is `z.infer<typeof ScanCVInputSchema>`, the schema stays in
   `tools/`). `ScanCVResultItem` is derived from `RetrievedChunk` (e.g. `Omit<…, "content">`) instead
   of a second hand-written interface. `orchestration/types.ts` and its `SourceReference` re-export
   are deleted. *Alternative:* a `types/index.ts` barrel — rejected: importing by scope
   (`@agent/types/sources`) keeps the language explicit.

5. **`app` depends only on `@agent/types/*` for types**, plus the narrow
   `@agent/extraction/scan-cv-sources` import for the extractor.

6. **Order of moves**: extract types first, then the `scan-cv` constant/extractors, then
   `orchestration/` → `turn/`, then `chat/` → `worker/`, then `app` imports, then docs. Each step
   leaves lint and tests green, and uses `git mv` so history follows the files.

## Risks / Trade-offs

- **Stale import paths or vitest/tsconfig/wrangler globs** (`@agent/*` alias, `main` in the wrangler
  config) → grep for old paths after each move; run `pnpm lint`, `pnpm test`, and start `pnpm
  dev:agent` + `pnpm dev:app` once for an end-to-end chat.
- **Type-only moves that accidentally pull runtime code into `app`'s bundle** → `types/` holds no
  values and `app` uses `import type`.
- **Docs drift** (several files cite old paths) → a final grep for `orchestration`, `chat/`,
  `extractSources`, `streamAgent`, `runAgent`, `AgentQueryOptions`.
- **Large diff** → mostly renames; kept reviewable by the step order above.

## Migration Plan

Single refactor merged via the apply PR; no data or deploy migration. Rollback is a revert of that PR.

## Open Questions

- Should `types/` become a repo-wide pattern (`rag`, `feed`, `app`)? Decide when adding the rule to
  `docs/code-conventions.md`: this change scopes it to `agent` and says so.
