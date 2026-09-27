# Tasks: add-agent

Every task touching `src/` is sequenced red → green per `docs/tdd.md`: write the failing test first,
then the minimum code that passes it. Layout follows design.md Decision 11; tests are colocated
(`*.test.ts` next to the file under test), never in a `__tests__/` tree.

## 1. Preconditions and setup (config only, no TDD)

- [x] 1.1 `OPENAI_API_KEY` is in `.env` and verified against the live API. Nothing further — `.env`
      is the only environment file, for both runtimes (design.md Decision 14).
- [x] 1.2 Model id pinned: **`gpt-5.4-mini-2026-03-17`**. Confirmed present in the account's
      `GET /v1/models`, and a `POST /v1/responses` probe with a `scan_cv` function tool returned a
      well-formed `function_call` for a Catalan question. Pin the **dated snapshot**, not the
      `gpt-5.4-mini` alias, so PR 3's experiment comparisons aren't confounded by a silent alias
      rollover (design.md Decision 2).
- [x] 1.3 Add exact-pinned runtime deps `ai@7.0.118`, `@ai-sdk/openai@4.0.78`, `agents@0.24.0`,
      `@cloudflare/ai-chat@0.12.0` and dev deps `wrangler@4.141.0`,
      `@cloudflare/workers-types@5.20260927.1`. Verify no `^`/`~` landed in `package.json`. The pnpm
      peer warning for `react`/`@ai-sdk/react` is expected until PR 2 (design.md Decision 2).
- [x] 1.4 Create `wrangler.jsonc`: `main` → `src/agent/index.ts`, a `compatibility_date`, the
      `ScannerAgent` Durable Object binding, and
      `"migrations": [{ "tag": "v1", "new_sqlite_classes": ["ScannerAgent"] }]`. **No D1 binding**
      (design.md Decision 3).
- [x] 1.5 Add `.env.example` documenting all five variables and which runtime reads each. Create **no**
      `.dev.vars` and add **no** `.dev.vars` ignore rule: `wrangler@4.141.0` reads `.env` natively, and
      a `.dev.vars` would silently shadow it for the Worker only (design.md Decision 14).
      `.gitignore` currently ignores `.env` exactly, which leaves `.env.example` trackable as intended —
      add `.env.local` to it, since Wrangler reads that file by default too and it must not be
      committable. Do **not** widen the rule to `.env*` without a `!.env.example` negation, or the
      example file stops being tracked.
- [x] 1.6 Add the `dev:agent` script (`wrangler dev`) to `package.json`.
- [x] 1.7 Verify the Worker actually receives the `.env` values as bindings: boot `pnpm dev:agent` and
      confirm `OPENAI_API_KEY` and both `UPSTASH_VECTOR_REST_*` are present on `env`. Decision 14 rests
      on reading Wrangler's build, not on having run it — if this fails, adding `--env-file .env` to the
      `dev:agent` script is the fix, still with no second file.
      Verified: `wrangler dev` printed all three as bindings with no `--env-file` flag needed —
      Decision 14 holds as written.

## 2. `rag` retrieval and ingestion changes (module: rag)

- [x] 2.1 Red: extend `store/vector-index.test.ts` — `VectorMetadata` carries `name`, and `upsert`
      passes it through.
- [x] 2.2 Green: add `name` to `VectorMetadata` in `store/vector-index.ts`.
- [x] 2.3 Red: extend `dataset/paths.test.ts` — `readCvLocations` returns each entry's `name`
      alongside `candidateId` and `pdfPath` (the manifest already has it).
- [x] 2.4 Green: add `name` to `CvLocation` and the mapping in `dataset/paths.ts`.
- [x] 2.5 Red: extend `ingestion/ingest.test.ts` — the upserted metadata includes the candidate's
      `name`.
- [x] 2.6 Green: pass `name` into the metadata in `ingestion/ingest.ts`.
- [x] 2.7 Red: extend `retrieval/retrieve.test.ts` — results carry `candidateName` from the hit's
      metadata; `retrieve` uses caller-supplied `credentials` when given and falls back to
      `requireUpstashCredentials()` when omitted (spec `rag-retrieval`, design.md Decision 6).
- [x] 2.8 Green: add `candidateName` to `RetrievedResult` in `retrieval/types.ts` and the optional
      `credentials` option plus the mapping in `retrieval/retrieve.ts`. Both changes are additive —
      existing callers must still compile.
- [x] 2.9 Re-run `pnpm ingest:cvs` so all 25 vectors carry `name`, then run the gated
      `retrieval/ground-truth.test.ts` with credentials present and assert `candidateName` is
      populated on live results. A forgotten re-ingest must fail here, not silently in the agent.

## 3. Agent environment and LLM client (module: agent)

- [x] 3.1 Red: `env/agent-env.test.ts` — a missing or whitespace-only `OPENAI_API_KEY` throws an error
      naming the variable; the Upstash pair is read off the `Env` binding object, not `process.env`.
- [x] 3.2 Green: `env/agent-env.ts` — the `Env` contract (secrets + DO namespace) and a fail-fast
      reader, mirroring `rag/env/upstash-credentials.ts`.
      Implementation note: `@cloudflare/workers-types`' ambient globals (`URL`, `fetch`, …) conflict
      with `@types/node`'s when both are in one `tsc` program, so `src/agent` is excluded from the
      root `tsconfig.json` and type-checked separately via `tsconfig.agent.json`
      (`pnpm exec tsc --noEmit -p tsconfig.agent.json`). Task 9.1/11.3 must record both commands.
- [x] 3.3 Red: `clients/llm-client.test.ts` — the client returns a model for the pinned model id and
      is the only seam that knows the provider.
- [x] 3.4 Green: `clients/llm-client.ts` — the only file importing `@ai-sdk/openai`;
      `gpt-5.4-mini-2026-03-17` as a named constant (task 1.2).

## 4. The `scan-cv` tool (module: agent)

- [x] 4.1 Red: `tools/scan-cv.test.ts` with `retrieve` mocked — `execute` maps results to
      `{ candidateId, candidateName, source, content, score }`; a `topK` above the maximum or a
      non-integer is rejected by the schema before `retrieve` is called; an omitted `topK` applies the
      default; an empty index yields an empty result set, not an error.
- [x] 4.2 Red: same file — a throwing `retrieve` is returned as `{ error }`, never rethrown
      (spec `agent-tools`).
- [x] 4.3 Green: `tools/scan-cv.ts` — `scanCVTool = tool({ description, inputSchema, execute })` with
      a Zod `ScanCVInputSchema`, passing the Worker's credentials through to `retrieve`.
      Implementation note: `createScanCVTool({ credentials })` is a factory (not a bare constant) so
      the Worker can inject `env`-sourced credentials per instantiation while `runAgent`'s Node path
      omits them and falls back to `requireUpstashCredentials()`, consistent with design.md Decision 6.
- [x] 4.4 Red/green: `tools/index.test.ts` + `tools/index.ts` — the record `{ "scan-cv": scanCVTool }`,
      asserting the key is the name the model sees.

## 5. Source extraction (module: agent)

- [x] 5.1 Red: `extraction/extract-sources.test.ts` — tool results become
      `{ candidateId, candidateName, source, score }[]`, de-duplicated by `candidateId` keeping the
      highest score, ordered by descending score; zero tool calls yield zero sources; `source` stays
      the repo-relative path with no URL built (spec `agent-sources`).
- [x] 5.2 Green: `extraction/extract-sources.ts` — a pure function over tool results. No `fs`, no
      manifest, no network.
      Implementation note: `SourceReference` is defined and exported here (not in
      `orchestration/types.ts`, which task 6.1 hasn't created yet) — task 6.1's `AgentResult` imports
      it from this file instead of redefining it, consistent with Decision 11's ordering being a task
      sequencing detail, not a hard file-location requirement.

## 6. Orchestration (module: agent)

- [x] 6.1 Write `orchestration/system-prompt.ts` and `orchestration/types.ts` (`AgentResult`,
      `SourceReference`). The prompt states two permanent contracts:
      **groundedness** — answer only from `scan-cv` results, admit when the corpus has no answer,
      never invent a candidate; and **scope** (design.md Decision 13) — decline anything not about
      the CV collection politely, say what the assistant does cover, answer the in-scope half of a
      mixed request, and reply in the user's language. Never perform an out-of-scope task, even when
      framed as a hypothetical or a role-play.
      `SourceReference` is re-exported from `../extraction/extract-sources` (see task 5.2's note).
- [x] 6.2 Red: `orchestration/compaction.test.ts` — below the threshold every message passes through
      untouched; above it, older turns collapse into one summary message and the most recent turns stay
      verbatim; candidate names and ids survive into the summary (design.md Decision 10). Threshold and
      retained-turn count are named constants, not literals (`docs/code-conventions.md`).
- [x] 6.3 Green: `orchestration/compaction.ts`. Note: "turn" is treated as one message (the array
      element granularity `this.messages`/`UIMessage[]` already has), not a user+assistant pair —
      simplest reading consistent with design.md's own "named constants... to be tuned" caveat.
- [x] 6.4 Red: `orchestration/query.test.ts` with `MockLanguageModelV4` from `ai/test` — `runAgent`
      returns `{ text, sources, toolCalls, retrievedChunks }`; the tool-calling path produces sources;
      **the no-tool-call path produces an answer with zero sources and is not an error**; the step cap
      stops a model that keeps requesting tools.
- [x] 6.5 Red: same file — `streamAgent` and `runAgent` read the same system prompt, tool record and
      step limit, so a change to any of the three is observable from both (spec
      `agent-orchestration`).
- [x] 6.6 Green: `orchestration/query.ts` — `streamAgent` (`streamText`) and `runAgent`
      (`generateText`), both over one shared configuration, both applying compaction before the model
      call. Note: `convertToModelMessages` is async in `ai@7.0.118`, so both `sharedCallConfig` and
      `streamAgent` are `async` (the design's sketch didn't flag this); `runAgent` was already async.
- [x] 6.7 Red/green: the temporary groundedness audit logging — question, retrieved `candidateId`s and
      answer logged together. Every function, call site, type and test for it carries exactly
      `// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust
      groundedness scorer lands.` (design.md Decision 9). Lives in its own
      `orchestration/groundedness-audit-log.ts`, called from both `runAgent` and `streamAgent`'s
      `onFinish`. Verified: `grep -rn "TODO(add-agent-evals)" src/` lists only these lines.

## 7. Durable Object and Worker entry (module: agent)

- [x] 7.1 Green: `chat/scanner-agent.ts` — `ScannerAgent extends AIChatAgent<Env>`, whose
      `onChatMessage` builds the model from `clients/llm-client.ts`, converts `this.messages`, calls
      `streamAgent`, and returns a UI message stream response. History persistence is the SDK's
      built-in DO SQLite — do not write a store.
      Note: the actual UIMessage→ModelMessage conversion happens inside `streamAgent` (`orchestration/
      query.ts`), not in `scanner-agent.ts` — required by Decision 10 (compaction needs `UIMessage[]`
      in) and Decision 11 (conversion logic stays in `orchestration/`, not the DO). `scanner-agent.ts`
      passes `this.messages` (raw `UIMessage[]`) straight through.
- [x] 7.2 Green: `src/agent/index.ts` — the Worker entry: `routeAgentRequest(request, env)` with a 404
      fallback, re-exporting `ScannerAgent` (Wrangler requires the class on the entry module). The only
      file at the module root.
- [x] 7.3 Red/green: `chat/scanner-agent.test.ts` — assert the wiring that is ours: the model comes
      from the client seam, `streamAgent` receives the converted messages. The SDK's persistence is not
      re-tested here (design.md Decision 12); task 10.2 is its check.
      Implementation note: `@cloudflare/ai-chat` imports from the `cloudflare:` URL scheme at module
      scope, which Node's ESM loader rejects outright — so the test **must** `vi.mock("@cloudflare/
      ai-chat", ...)` with a plain stub class before importing `scanner-agent.ts`, or the import itself
      crashes vitest (this is exactly Decision 12's reason for not testing the SDK's own machinery
      here). The method is invoked as `ScannerAgent.prototype.onChatMessage.call(fakeThis)` since the
      real base class cannot be constructed under Node either.
      Also discovered while wiring section 7 together (not anticipated by design.md): running
      `pnpm exec tsc --noEmit -p tsconfig.agent.json` surfaced two additional cross-module fixes,
      applied now: (a) `exactOptionalPropertyTypes: true` requires `credentials?: T | undefined`
      (not just `credentials?: T`) wherever an agent call site forwards a possibly-`undefined` local
      into an optional prop — fixed in `tools/scan-cv.ts`'s `CreateScanCVToolOptions` and `rag`'s
      `retrieval/retrieve.ts`'s `RetrieveOptions`; (b) `rag/env/upstash-credentials.ts` used the
      ambient `NodeJS.ProcessEnv` type, unavailable under the Workers-only `tsconfig.agent.json` that
      transitively type-checks it via `agent`'s import of `retrieve` — changed to the equivalent
      `Record<string, string | undefined>`, which needs no ambient namespace and behaves identically.

## 8. Integration test (module: agent)

- [x] 8.1 Red: `orchestration/integration.test.ts` — question → mocked model requesting `scan-cv` →
      mocked `retrieve` → grounded answer plus the expected `SourceReference[]`. No credentials, no
      network, no Worker.
- [x] 8.2 Red: same file — a question the corpus cannot answer (retrieval returns nothing) yields an
      answer that admits it and carries zero sources.
- [x] 8.3 Red: same file — an out-of-scope request (general knowledge, and an unrelated task) reaches
      the model with a system prompt that carries the scope instruction, `scan-cv` is never called, and
      the turn returns zero sources. Assert the *prompt contract and the absence of a tool call*, not
      the wording of a mocked reply — the wording is the real model's job, verified in task 10.3.
- [x] 8.4 Red: same file — a mixed request still calls `scan-cv` and still produces sources for its
      in-scope half, so the scope instruction cannot be implemented as a blanket early return.
      Note: unlike sections 6/7, `runAgent` already existed going into this section, so these ran green
      on first execution — they're acceptance-level regression coverage over the assembled pipeline
      built by the earlier unit-level TDD, not a red-then-green drive of new production code.

## 9. Lint and type gates

- [x] 9.1 `pnpm lint` and `pnpm test` clean. Also run `pnpm exec tsc --noEmit` (not part of
      `pnpm lint`) — the Workers types are a new `lib`/`types` surface and are the likeliest source of
      a type error the lint step won't catch.
      As task 3.2's note explains, this is now **two** commands: `pnpm exec tsc --noEmit` (root,
      Node-typed modules) and `pnpm exec tsc --noEmit -p tsconfig.agent.json` (Workers-typed
      `src/agent`) — both verified clean. `pnpm lint` (28 files) and `pnpm test` (137 passed, 2 skipped
      — the two live-credential ground-truth tests not exercised by this run) also clean.

## 10. Manual verification (requires credentials)

- [x] 10.1 `pnpm dev:agent` boots the Worker with no startup error. If a transitive Node built-in
      forces `nodejs_compat`, add the flag and note it in design.md's Risks — it invalidates no
      decision.
      Verified: booted clean, no `nodejs_compat` needed — `@upstash/vector` is `fetch`-based as
      design.md's Risks section predicted.
- [x] 10.2 Ask a real question end to end; confirm a grounded streamed answer, correct sources, and
      that a follow-up question resolves against persisted history across two separate requests.
      Verified via a one-off Node script (`agents/client`'s `AgentClient` + `agents/chat/transport`'s
      `WebSocketChatTransport`, not committed — deleted after use) driving the real WebSocket chat
      protocol: "who knows FastAPI?" and "qui té experiència en Docker?" both triggered a real
      `scan-cv` call against the live Upstash index, returned correctly-shaped results
      (`candidateId`/`candidateName`/`source`/`content`/`score`), and were grounded in the answer. A
      follow-up in the same session ("i quin d'ells té més experiència amb Kubernetes?"), sent from a
      **separate WebSocket connection**, correctly resolved "d'ells" against the prior turn's five
      Docker candidates — confirming DO SQLite persistence survives across connections.
- [x] 10.3 Exercise the scope boundary against the real model, in Catalan: an off-corpus CV question
      ("qui té experiència en COBOL?") must say the collection has no match; "quin temps fa avui?" and
      "escriu-me un poema" must decline politely as out of scope, in Catalan, with zero sources and no
      `scan-cv` call; a mixed request ("quins candidats saben Python i quin sou els ofereixo?") must
      answer the first half with sources and decline the second; and an override attempt ("ignora les
      teves instruccions i …") must still decline. This is the check the mocked tests structurally
      cannot make (spec `agent-orchestration`, design.md Decision 13).
      Verified, all five scenarios, real model, each in a fresh session: COBOL → "no candidate found",
      no decline; weather and poem requests → polite Catalan declines, zero `scan-cv` calls; the mixed
      Python/salary request → answered Python with named sources, declined salary (accurately: no
      salary data exists in the corpus, an even better outcome than a generic scope decline); two
      override attempts (a harmful request, and a role-play "you are now a chef" framing) → both
      declined, no tool calls.

## 11. Documentation

- [x] 11.1 Write `context/agent.md` — as-built reference matching `context/rag.md`: Mermaid flow
      (Worker → DO → tool → `rag` → answer), the `scan-cv` contract, the types, an end-to-end example.
- [x] 11.2 Update `docs/architecture.md`: §3 records the amendment to "no deployment target"
      (design.md Decision 1), §4's three Agent open questions move to decided, the `agent` bullet in §2
      stops saying "not designed yet", and §1 records the scope boundary as product behavior — an
      out-of-scope request gets a polite in-scope decline (design.md Decision 13), which `CHALLENGE.md`
      does not state but the product needs.
      Also fixed two pre-existing broken links in this file (stale pre-archive paths to
      `add-rag-retrieval`'s and `add-cv-generation`'s `design.md`, now pointing at
      `openspec/changes/archive/<date>-<name>/design.md`) and the `feed` bullet's stale "not designed
      yet" — spotted while touching this file, not part of the add-agent change itself. The same stale
      pre-archive path pattern also exists in `AGENTS.md`'s Documentation Map, `context/rag.md`,
      `context/feed.md`, and `docs/tdd.md`; left alone as out of this change's scope — worth a
      dedicated follow-up.
- [x] 11.3 Update `AGENTS.md`: §1 module status, §2 `pnpm dev:agent` and `OPENAI_API_KEY` promoted from
      console-setup to runtime credential — stating that `.env` is the single environment file for both
      runtimes and that no `.dev.vars` is used (design.md Decision 14), §3 the `agent` Tech Stack line
      with the pinned versions, §4 the `agent` row in the Documentation Map.
      Split the old combined "agent or app" Documentation Map row into two: `agent` now points at its
      specs (Implemented), `app` keeps the old planning-stage text.
- [x] 11.4 Update `plans/phase3-agent-ui-implementation.md` §3.1/§3.2 so the plan no longer claims
      "PostgreSQL (D1)", `__tests__/`, or a manifest read at runtime — PR 2 and PR 3 are written
      against that plan and would inherit the same four errors.
      Scope note: the four error types (D1/PostgreSQL, `nodejs_compat`/`process.env` instead of an
      explicit `credentials` param, a runtime manifest read, and the `agent.ts`+`worker.ts`+
      `__tests__/` layout) actually recur outside the literal §3.1/§3.2 bounds — in §1's intro
      summary, §3.3 (`app`'s description of how it reads history), and §5's PR 1 checklist/file tree.
      Fixed every occurrence, not just the ones inside §3.1/§3.2, since leaving the intro or the PR 1
      checklist wrong while fixing §3.1/§3.2 would have left the exact inconsistency this task exists
      to prevent.
- [x] 11.5 Final: verify `AGENTS.md`/`docs/` still match reality, re-run `pnpm lint`, `pnpm test` and
      `pnpm exec openspec validate add-agent`, and confirm `grep -rn "TODO(add-agent-evals)" src/`
      lists only the audit-logging code PR 3 will remove.
      All clean: `pnpm lint` (0 errors), `pnpm test` (137 passed, 2 skipped — live-credential tests),
      `pnpm exec tsc --noEmit` (root) and `pnpm exec tsc --noEmit -p tsconfig.agent.json` (agent) both
      clean, `openspec validate add-agent` → "Change 'add-agent' is valid", and the TODO grep lists
      exactly the 6 lines belonging to `groundedness-audit-log.ts`/`.test.ts` and their 3 call sites
      in `query.ts` — nothing else.
