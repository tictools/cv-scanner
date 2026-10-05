## 1. Type catalog (`src/agent/types/`)

- [ ] 1.1 Create `types/{turn,tools,sources,chunks,env,clients,audit}.ts` and move every exported `type`/`interface` into them (`TurnOptions` ex `AgentQueryOptions`, `AgentResult`, `AgentToolCall`, `ToolResultInput`, `CreateToolsOptions`, `CreateScanCVToolOptions`, `ScanCVInput`, `SourceReference`, `RetrievedChunk`, `Env`, `LlmClientOptions`, `GroundednessAuditEntry`); declarations only, no barrel
- [ ] 1.2 Derive `ScanCVResultItem` from `RetrievedChunk` instead of a second hand-written interface
- [ ] 1.3 Point all `agent` imports at `../types/<scope>`; delete `orchestration/types.ts` and its `SourceReference` re-export
- [ ] 1.4 Verify `grep -rn "^export \(interface\|type\)" src/agent --exclude-dir=types` returns nothing; `pnpm lint` and `pnpm test` pass

## 2. Tool-scoped extractors (`agent-sources`)

- [ ] 2.1 Export `SCAN_CV_TOOL_NAME` from `tools/scan-cv.ts`; use it in `tools/index.ts` and remove the other `"scan-cv"` literals
- [ ] 2.2 `git mv` `extraction/extract-sources.ts` (+ test) to `extraction/scan-cv-sources.ts`, rename `extractSources` → `extractScanCVSources`
- [ ] 2.3 Move private `extractRetrievedChunks` out of `query.ts` into exported `extraction/scan-cv-chunks.ts` (`extractScanCVChunks`); share `isScanCVResultItems` between both extractors
- [ ] 2.4 Add `scan-cv-chunks.test.ts` covering the delta-spec scenarios (other tool ignored, sources/chunks agree, malformed output yields nothing)

## 3. Turn runner (`orchestration/` → `turn/`)

- [ ] 3.1 `git mv` `orchestration/` files (`compaction`, `system-prompt`, `groundedness-audit-log`, tests, `integration.test.ts`) into `turn/`
- [ ] 3.2 Split `query.ts` into `turn/stream-turn.ts` (`streamTurn`), `turn/run-turn.ts` (`runTurn`) and `turn/turn-config.ts` (`buildTurnConfig`, `DEFAULT_MAX_STEPS`); split/rename `query.test.ts` to follow the code, without rewriting assertions
- [ ] 3.3 Update `streamAgent`/`runAgent` call sites (worker, tests); delete empty `orchestration/`

## 4. Worker adapter (`chat/` → `worker/`)

- [ ] 4.1 `git mv src/agent/chat src/agent/worker` and fix imports in `index.ts` and tests
- [ ] 4.2 Check `wrangler` config, tsconfig/vitest globs and scripts for the old path; confirm `pnpm dev:agent` starts

## 5. `app` imports

- [ ] 5.1 Update `SourceEntry.tsx`, `SourcePanel.tsx`, `displayed-sources.ts`, `latest-answered-sources.ts`, `message-sources.ts` (and tests) to import types from `@agent/types/sources` and the extractor from `@agent/extraction/scan-cv-sources`
- [ ] 5.2 Confirm `app` imports agent types only from `@agent/types/*`

## 6. Docs and specs

- [ ] 6.1 `docs/atomic-design.md` (~l.683): point `agent` types to `@agent/types/*`
- [ ] 6.2 `docs/architecture.md` (~l.80, 193, 225) and `context/workflow.md` (~l.35, 76, 99): new paths and `extractScanCVSources`
- [ ] 6.3 `AGENTS.md` §3: `chat/scanner-agent.ts` → `worker/scanner-agent.ts`; fix the stale `agent` Documentation Map row (archived under `openspec/changes/archive/2026-09-27-add-agent/`, specs under `openspec/specs/agent-*`)
- [ ] 6.4 `docs/code-conventions.md`: add the "exported types live in the module's `types/` catalog" rule, scoped to `agent` (note the repo-wide question as open)
- [ ] 6.5 Re-check `openspec/specs/agent-*` and `app-sources` for function/path names needing a delta

## 7. Final verification

- [ ] 7.1 Grep for leftovers: `orchestration`, `chat/`, `extractSources`, `extractRetrievedChunks`, `streamAgent`, `runAgent`, `AgentQueryOptions`, and `"scan-cv"` outside `tools/scan-cv.ts`
- [ ] 7.2 Verify AGENTS.md/docs still match reality; run `pnpm lint` and `pnpm test`
- [ ] 7.3 Run `pnpm dev:agent` + `pnpm dev:app` and confirm the chat answers with sources end to end
