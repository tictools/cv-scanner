## Why

`src/agent/` exports names that don't say what they do at the import site. `orchestration/query.ts`
holds `streamAgent`/`runAgent`, which both run one conversation turn. `extractSources` only keeps
`scan-cv` results, and the same filter plus the `"scan-cv"` literal is copied across three files.
Exported types are scattered over seven files with no single catalog. Fixing it now, before a second
tool ships, is cheap. Later it is not. Tracked in
[issue #26](https://github.com/tictools/cv-scanner/issues/26).

## What Changes

Pure naming and layout refactor — runtime behavior does not change.

- `orchestration/` → `turn/`: `streamAgent` → `streamTurn`, `runAgent` → `runTurn`, `sharedCallConfig` →
  `buildTurnConfig` (with `DEFAULT_MAX_STEPS`), `AgentQueryOptions` → `TurnOptions`. `compaction`,
  `system-prompt`, `groundedness-audit-log` and their tests move along. `orchestration/` is deleted.
- `chat/` → `worker/` (the Cloudflare Durable Object adapter). `index.ts` stays at the module root.
- `extractSources` → `extractScanCVSources` (`extraction/scan-cv-sources.ts`); private
  `extractRetrievedChunks` → exported, tested `extractScanCVChunks` (`extraction/scan-cv-chunks.ts`).
  One `SCAN_CV_TOOL_NAME` exported from `tools/scan-cv.ts`; the type guard `isScanCVResultItems` is shared.
- New `src/agent/types/` catalog (`turn`, `tools`, `sources`, `chunks`, `env`, `clients`, `audit`),
  declarations only, no barrel. Every exported `type`/`interface` in `agent` moves there;
  `orchestration/types.ts` is deleted.
- `app` imports `extractScanCVSources` and types from `@agent/extraction/scan-cv-sources` and
  `@agent/types/*`.
- Docs updated: `AGENTS.md` (§3 path, stale `agent` Documentation Map row), `docs/architecture.md`,
  `docs/atomic-design.md`, `docs/code-conventions.md`, `context/workflow.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-sources` (module: agent): adds one requirement making explicit that source and chunk
  extraction is scoped to `scan-cv` results through one shared tool-name definition. The existing
  behavior is unchanged; `agent-orchestration`, `agent-tools` and `app-sources` describe behavior,
  not names, so they need no delta.

## Impact

- Code: all of `src/agent/`; 5 files under `src/app/` (imports only).
- Tests are moved/renamed, not rewritten, except a new test for `extractScanCVChunks`.
- No new dependencies, no API or wire-format change; `wrangler` still points at `src/agent/index.ts`.

## Non-goals

- No behavior change, no new tool, no change to prompts, step limit, or the source-panel UI.
- Not adopting `types/` in `rag`, `feed` or `app` (repo-wide adoption is left as an open question).
- No `types/index.ts` barrel.
- Not editing the archived OpenSpec changes.
