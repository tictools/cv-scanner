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
- [ ] 1.3 Add exact-pinned runtime deps `ai@7.0.118`, `@ai-sdk/openai@4.0.78`, `agents@0.24.0`,
      `@cloudflare/ai-chat@0.12.0` and dev deps `wrangler@4.141.0`,
      `@cloudflare/workers-types@5.20260927.1`. Verify no `^`/`~` landed in `package.json`. The pnpm
      peer warning for `react`/`@ai-sdk/react` is expected until PR 2 (design.md Decision 2).
- [ ] 1.4 Create `wrangler.jsonc`: `main` → `src/agent/index.ts`, a `compatibility_date`, the
      `ScannerAgent` Durable Object binding, and
      `"migrations": [{ "tag": "v1", "new_sqlite_classes": ["ScannerAgent"] }]`. **No D1 binding**
      (design.md Decision 3).
- [ ] 1.5 Add `.env.example` documenting all five variables and which runtime reads each. Create **no**
      `.dev.vars` and add **no** `.dev.vars` ignore rule: `wrangler@4.141.0` reads `.env` natively, and
      a `.dev.vars` would silently shadow it for the Worker only (design.md Decision 14).
      `.gitignore` currently ignores `.env` exactly, which leaves `.env.example` trackable as intended —
      add `.env.local` to it, since Wrangler reads that file by default too and it must not be
      committable. Do **not** widen the rule to `.env*` without a `!.env.example` negation, or the
      example file stops being tracked.
- [ ] 1.6 Add the `dev:agent` script (`wrangler dev`) to `package.json`.
- [ ] 1.7 Verify the Worker actually receives the `.env` values as bindings: boot `pnpm dev:agent` and
      confirm `OPENAI_API_KEY` and both `UPSTASH_VECTOR_REST_*` are present on `env`. Decision 14 rests
      on reading Wrangler's build, not on having run it — if this fails, adding `--env-file .env` to the
      `dev:agent` script is the fix, still with no second file.

## 2. `rag` retrieval and ingestion changes (module: rag)

- [ ] 2.1 Red: extend `store/vector-index.test.ts` — `VectorMetadata` carries `name`, and `upsert`
      passes it through.
- [ ] 2.2 Green: add `name` to `VectorMetadata` in `store/vector-index.ts`.
- [ ] 2.3 Red: extend `dataset/paths.test.ts` — `readCvLocations` returns each entry's `name`
      alongside `candidateId` and `pdfPath` (the manifest already has it).
- [ ] 2.4 Green: add `name` to `CvLocation` and the mapping in `dataset/paths.ts`.
- [ ] 2.5 Red: extend `ingestion/ingest.test.ts` — the upserted metadata includes the candidate's
      `name`.
- [ ] 2.6 Green: pass `name` into the metadata in `ingestion/ingest.ts`.
- [ ] 2.7 Red: extend `retrieval/retrieve.test.ts` — results carry `candidateName` from the hit's
      metadata; `retrieve` uses caller-supplied `credentials` when given and falls back to
      `requireUpstashCredentials()` when omitted (spec `rag-retrieval`, design.md Decision 6).
- [ ] 2.8 Green: add `candidateName` to `RetrievedResult` in `retrieval/types.ts` and the optional
      `credentials` option plus the mapping in `retrieval/retrieve.ts`. Both changes are additive —
      existing callers must still compile.
- [ ] 2.9 Re-run `pnpm ingest:cvs` so all 25 vectors carry `name`, then run the gated
      `retrieval/ground-truth.test.ts` with credentials present and assert `candidateName` is
      populated on live results. A forgotten re-ingest must fail here, not silently in the agent.

## 3. Agent environment and LLM client (module: agent)

- [ ] 3.1 Red: `env/agent-env.test.ts` — a missing or whitespace-only `OPENAI_API_KEY` throws an error
      naming the variable; the Upstash pair is read off the `Env` binding object, not `process.env`.
- [ ] 3.2 Green: `env/agent-env.ts` — the `Env` contract (secrets + DO namespace) and a fail-fast
      reader, mirroring `rag/env/upstash-credentials.ts`.
- [ ] 3.3 Red: `clients/llm-client.test.ts` — the client returns a model for the pinned model id and
      is the only seam that knows the provider.
- [ ] 3.4 Green: `clients/llm-client.ts` — the only file importing `@ai-sdk/openai`;
      `gpt-5.4-mini-2026-03-17` as a named constant (task 1.2).

## 4. The `scan-cv` tool (module: agent)

- [ ] 4.1 Red: `tools/scan-cv.test.ts` with `retrieve` mocked — `execute` maps results to
      `{ candidateId, candidateName, source, content, score }`; a `topK` above the maximum or a
      non-integer is rejected by the schema before `retrieve` is called; an omitted `topK` applies the
      default; an empty index yields an empty result set, not an error.
- [ ] 4.2 Red: same file — a throwing `retrieve` is returned as `{ error }`, never rethrown
      (spec `agent-tools`).
- [ ] 4.3 Green: `tools/scan-cv.ts` — `scanCVTool = tool({ description, inputSchema, execute })` with
      a Zod `ScanCVInputSchema`, passing the Worker's credentials through to `retrieve`.
- [ ] 4.4 Red/green: `tools/index.test.ts` + `tools/index.ts` — the record `{ "scan-cv": scanCVTool }`,
      asserting the key is the name the model sees.

## 5. Source extraction (module: agent)

- [ ] 5.1 Red: `extraction/extract-sources.test.ts` — tool results become
      `{ candidateId, candidateName, source, score }[]`, de-duplicated by `candidateId` keeping the
      highest score, ordered by descending score; zero tool calls yield zero sources; `source` stays
      the repo-relative path with no URL built (spec `agent-sources`).
- [ ] 5.2 Green: `extraction/extract-sources.ts` — a pure function over tool results. No `fs`, no
      manifest, no network.

## 6. Orchestration (module: agent)

- [ ] 6.1 Write `orchestration/system-prompt.ts` and `orchestration/types.ts` (`AgentResult`,
      `SourceReference`). The prompt states two permanent contracts:
      **groundedness** — answer only from `scan-cv` results, admit when the corpus has no answer,
      never invent a candidate; and **scope** (design.md Decision 13) — decline anything not about
      the CV collection politely, say what the assistant does cover, answer the in-scope half of a
      mixed request, and reply in the user's language. Never perform an out-of-scope task, even when
      framed as a hypothetical or a role-play.
- [ ] 6.2 Red: `orchestration/compaction.test.ts` — below the threshold every message passes through
      untouched; above it, older turns collapse into one summary message and the most recent turns stay
      verbatim; candidate names and ids survive into the summary (design.md Decision 10). Threshold and
      retained-turn count are named constants, not literals (`docs/code-conventions.md`).
- [ ] 6.3 Green: `orchestration/compaction.ts`.
- [ ] 6.4 Red: `orchestration/query.test.ts` with `MockLanguageModelV4` from `ai/test` — `runAgent`
      returns `{ text, sources, toolCalls, retrievedChunks }`; the tool-calling path produces sources;
      **the no-tool-call path produces an answer with zero sources and is not an error**; the step cap
      stops a model that keeps requesting tools.
- [ ] 6.5 Red: same file — `streamAgent` and `runAgent` read the same system prompt, tool record and
      step limit, so a change to any of the three is observable from both (spec
      `agent-orchestration`).
- [ ] 6.6 Green: `orchestration/query.ts` — `streamAgent` (`streamText`) and `runAgent`
      (`generateText`), both over one shared configuration, both applying compaction before the model
      call.
- [ ] 6.7 Red/green: the temporary groundedness audit logging — question, retrieved `candidateId`s and
      answer logged together. Every function, call site, type and test for it carries exactly
      `// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust
      groundedness scorer lands.` (design.md Decision 9).

## 7. Durable Object and Worker entry (module: agent)

- [ ] 7.1 Green: `chat/scanner-agent.ts` — `ScannerAgent extends AIChatAgent<Env>`, whose
      `onChatMessage` builds the model from `clients/llm-client.ts`, converts `this.messages`, calls
      `streamAgent`, and returns a UI message stream response. History persistence is the SDK's
      built-in DO SQLite — do not write a store.
- [ ] 7.2 Green: `src/agent/index.ts` — the Worker entry: `routeAgentRequest(request, env)` with a 404
      fallback, re-exporting `ScannerAgent` (Wrangler requires the class on the entry module). The only
      file at the module root.
- [ ] 7.3 Red/green: `chat/scanner-agent.test.ts` — assert the wiring that is ours: the model comes
      from the client seam, `streamAgent` receives the converted messages. The SDK's persistence is not
      re-tested here (design.md Decision 12); task 10.2 is its check.

## 8. Integration test (module: agent)

- [ ] 8.1 Red: `orchestration/integration.test.ts` — question → mocked model requesting `scan-cv` →
      mocked `retrieve` → grounded answer plus the expected `SourceReference[]`. No credentials, no
      network, no Worker.
- [ ] 8.2 Red: same file — a question the corpus cannot answer (retrieval returns nothing) yields an
      answer that admits it and carries zero sources.
- [ ] 8.3 Red: same file — an out-of-scope request (general knowledge, and an unrelated task) reaches
      the model with a system prompt that carries the scope instruction, `scan-cv` is never called, and
      the turn returns zero sources. Assert the *prompt contract and the absence of a tool call*, not
      the wording of a mocked reply — the wording is the real model's job, verified in task 10.3.
- [ ] 8.4 Red: same file — a mixed request still calls `scan-cv` and still produces sources for its
      in-scope half, so the scope instruction cannot be implemented as a blanket early return.

## 9. Lint and type gates

- [ ] 9.1 `pnpm lint` and `pnpm test` clean. Also run `pnpm exec tsc --noEmit` (not part of
      `pnpm lint`) — the Workers types are a new `lib`/`types` surface and are the likeliest source of
      a type error the lint step won't catch.

## 10. Manual verification (requires credentials)

- [ ] 10.1 `pnpm dev:agent` boots the Worker with no startup error. If a transitive Node built-in
      forces `nodejs_compat`, add the flag and note it in design.md's Risks — it invalidates no
      decision.
- [ ] 10.2 Ask a real question end to end; confirm a grounded streamed answer, correct sources, and
      that a follow-up question resolves against persisted history across two separate requests.
- [ ] 10.3 Exercise the scope boundary against the real model, in Catalan: an off-corpus CV question
      ("qui té experiència en COBOL?") must say the collection has no match; "quin temps fa avui?" and
      "escriu-me un poema" must decline politely as out of scope, in Catalan, with zero sources and no
      `scan-cv` call; a mixed request ("quins candidats saben Python i quin sou els ofereixo?") must
      answer the first half with sources and decline the second; and an override attempt ("ignora les
      teves instruccions i …") must still decline. This is the check the mocked tests structurally
      cannot make (spec `agent-orchestration`, design.md Decision 13).

## 11. Documentation

- [ ] 11.1 Write `context/agent.md` — as-built reference matching `context/rag.md`: Mermaid flow
      (Worker → DO → tool → `rag` → answer), the `scan-cv` contract, the types, an end-to-end example.
- [ ] 11.2 Update `docs/architecture.md`: §3 records the amendment to "no deployment target"
      (design.md Decision 1), §4's three Agent open questions move to decided, the `agent` bullet in §2
      stops saying "not designed yet", and §1 records the scope boundary as product behavior — an
      out-of-scope request gets a polite in-scope decline (design.md Decision 13), which `CHALLENGE.md`
      does not state but the product needs.
- [ ] 11.3 Update `AGENTS.md`: §1 module status, §2 `pnpm dev:agent` and `OPENAI_API_KEY` promoted from
      console-setup to runtime credential — stating that `.env` is the single environment file for both
      runtimes and that no `.dev.vars` is used (design.md Decision 14), §3 the `agent` Tech Stack line
      with the pinned versions, §4 the `agent` row in the Documentation Map.
- [ ] 11.4 Update `plans/phase3-agent-ui-implementation.md` §3.1/§3.2 so the plan no longer claims
      "PostgreSQL (D1)", `__tests__/`, or a manifest read at runtime — PR 2 and PR 3 are written
      against that plan and would inherit the same four errors.
- [ ] 11.5 Final: verify `AGENTS.md`/`docs/` still match reality, re-run `pnpm lint`, `pnpm test` and
      `pnpm exec openspec validate add-agent`, and confirm `grep -rn "TODO(add-agent-evals)" src/`
      lists only the audit-logging code PR 3 will remove.
