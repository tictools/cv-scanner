# Design: add-agent

## Context

`feed` and `rag` are implemented and archived. 25 CV PDFs are indexed as 25 vectors in Upstash, and
`retrieve(query, { topK })` returns `{ candidateId, source, content, score }[]`. Nothing turns that
into an answer.

Per `docs/architecture.md` §2, `agent` owns the answer: question + retrieved chunks → grounded
answer + source references, importing exactly one function from `rag` and knowing nothing about the
UI. §4 leaves three agent questions open (source indication, groundedness enforcement, which LLM);
this change closes all three.

The shape below comes from `plans/phase3-agent-ui-implementation.md` §3-4. Every package version,
export and storage claim in that plan was verified against the published packages and the real repo
while writing this design — four claims did not survive, and Decisions 3, 6, 7 and 11 record the
corrections rather than quietly implementing something different.

Constraints inherited from the repo: TypeScript ESM, pnpm with exact pinned versions, TDD per
`docs/tdd.md`, directory-per-concern with colocated tests per `docs/code-conventions.md`, external
APIs behind a thin client wrapper, and cross-module coupling only through narrow interfaces.

## Goals / Non-Goals

**Goals:**

- Answer a natural-language question about the CV corpus, grounded only in retrieved CV text, with
  the sources that grounded it.
- Make retrieval a **tool the model chooses to call**, so the project demonstrates agentic tool use
  rather than a hardcoded pipeline, and so the next tool is a one-file addition.
- Expose the orchestration core as a plain function (`runAgent`) that the eval harness (PR 3) can
  call with no Worker, no Durable Object and no UI.
- Keep the Cloudflare and OpenAI SDKs behind seams narrow enough that neither leaks into the tool
  or source-extraction logic.
- Keep `pnpm test` and CI green with no OpenAI credential.

**Non-Goals:**

- Any UI (PR 2), any scorer or eval harness (PR 3).
- Deploying to Cloudflare. `wrangler dev` is the target; `wrangler deploy` is untested here.
- Multi-user auth, rate limiting, observability beyond `console` logging.
- Re-ranking, score thresholds, or query rewriting — `rag`'s spec deliberately leaves relevance
  policy to `agent`, and this change's policy is "pass the top-K through to the model".

## Decisions

### Decision 1 — Runtime: Cloudflare Worker + Durable Object, amending the "no deployment target" rule

`ScannerAgent` is a Durable Object extending `AIChatAgent`; a Worker routes to it with
`routeAgentRequest`. `pnpm dev:agent` runs `wrangler dev`.

This **partly contradicts** `docs/architecture.md` §3's "No deployment target: architecture should
optimize for `pnpm install` + a `.env`". The contradiction is deliberate and must be written into §3
rather than left as a silent drift: `agent` needs a second local runtime (Workerd via
`wrangler dev`) and a config file (`wrangler.jsonc`). What survives is not only the *spirit* — no
hosting account, no deploy step — but the letter too: `pnpm install` plus a single `.env` is still
the whole setup, because Wrangler reads `.env` natively (Decision 14).

*Why accept it:* session identity and history persistence come for free. A Durable Object is keyed
by session id, is single-threaded per key, and carries its own SQLite. Rolling that ourselves in
plain Node means inventing a session store, a history store and a streaming transport — three
things the SDK already does, in the module whose actual job is grounded answers.

*Alternatives considered:*

- **Plain Node HTTP server + in-process history.** The honest reading of architecture.md §3, and
  genuinely simpler for PR 1 alone. Rejected because history then has to be persisted somewhere we
  design ourselves (a JSON file, SQLite, or nothing), and "nothing" fails the plan's requirement
  that history survive a refresh.
- **In-process function call, no server at all** (architecture.md §4's open question for `app`).
  Rejected: it forces `app` into the same Node process, which Vite's dev server is not, and it
  would make PR 2's streaming story ad-hoc.
- **Workers without Durable Objects** (stateless Worker + D1). Rejected: see Decision 3 — it adds a
  database to replace state a DO already holds.

*Flag:* new dependencies — `AGENTS.md` §3 "Tech Stack" gains the `agent` line, §2 "Getting Started"
gains `pnpm dev:agent` and `OPENAI_API_KEY`'s promotion to a runtime credential.

### Decision 2 — LLM provider: OpenAI via `@ai-sdk/openai`, behind the AI SDK

Pin `ai@7.0.118`, `@ai-sdk/openai@4.0.78`, `agents@0.24.0`, `@cloudflare/ai-chat@0.12.0`;
`wrangler@4.141.0` and `@cloudflare/workers-types@5.20260927.1` as dev deps.

The provider is reached only through `clients/llm-client.ts`, which returns an AI SDK
`LanguageModel`. Nothing else in `agent` imports `@ai-sdk/openai`, mirroring how
`store/vector-index.ts` is the only file in `rag` importing `@upstash/vector`.

*Alternatives considered:*

- **Reuse Gemini**, already a dependency with a working key (`feed` uses it). The cheapest option
  on credentials, and it is what architecture.md §3 floated. Rejected per the plan's decision: the
  answer quality that matters here is instruction-following on a strict groundedness constraint, and
  a second provider behind a one-file seam costs little. Recorded as the fallback if the OpenAI key
  turns out to be a blocker (see Risks).
- **Anthropic.** Rejected only for lack of an existing account in this project; no technical
  objection.
- **Calling OpenAI's REST API directly**, no AI SDK. Rejected: the tool-call loop (model asks for a
  tool → validate input → execute → feed the result back → repeat under a step cap) is exactly what
  `streamText` + `stopWhen` already implement, and `@cloudflare/ai-chat` expects an AI SDK stream.

*Note on peers:* `@cloudflare/ai-chat` declares `react` and `@ai-sdk/react` peers. Those are for its
`/react` subpath only, which PR 1 does not import; pnpm will warn about the missing peers and that
warning is expected until PR 2 adds React.

**Model id: `gpt-5.4-mini-2026-03-17`**, verified against the account's own model list rather than
assumed. A probe against `POST /v1/responses` with a `scan_cv` function tool confirmed the behavior
this design depends on: the model emitted a `function_call` with `{"query":"FastAPI experience",
"topK":5}` for a question asked in Catalan — it chose to call the tool, filled the optional `topK`
itself, and translated the query into the corpus's dominant language unprompted (97 tokens total).

*Pin the dated snapshot, not the `gpt-5.4-mini` alias.* The alias is the same model today, but it
rolls forward silently. PR 3's whole deliverable is comparing experiments across agent iterations, and
an alias that changes under it would attribute a model swap to a prompt change. The floating alias is
the right default for a product that wants free upgrades; it is the wrong one for a measurement
harness.

*Alternatives considered:* `gpt-5.4-nano` (cheaper, and 25 short CVs is not a hard reasoning task) —
worth trying as PR 3's first controlled iteration rather than as the baseline, since groundedness
instruction-following is exactly what the smallest tier tends to give up. `gpt-5.4` (stronger, ~an
order of magnitude dearer) — no evidence yet that the task needs it; PR 3's scorers are what should
justify the upgrade if the mini tier underperforms.

### Decision 3 — Chat history: the Durable Object's own SQLite. No D1, no PostgreSQL

The plan says history lives in "PostgreSQL (D1)". Verified against `@cloudflare/ai-chat@0.12.0`'s
build: `AIChatAgent` persists messages through `this.sql` into the Durable Object's embedded SQLite
(tables `cf_ai_chat_agent_*`, `cf_ai_chat_request_context`), and exposes `maxPersistedMessages` to
cap how many it keeps. `wrangler.jsonc` needs only
`"migrations": [{ "tag": "v1", "new_sqlite_classes": ["ScannerAgent"] }]`.

So the plan is wrong twice over: **D1 is SQLite, not PostgreSQL**, and **no D1 binding is needed at
all** — adding one would mean a second database holding a copy of state the DO already persists,
plus migrations and a write path fighting the SDK's own.

*Alternatives considered:*

- **A D1 binding as the plan describes.** Rejected: redundant store, and it would require
  overriding the SDK's persistence seams (`saveMessages`/`persistMessages`) to redirect writes —
  more code and more risk, for an "inspectable outside the DO" property PR 1 has no use for.
- **No persistence** (history in memory, lost on eviction). Rejected: it breaks the plan's
  requirement that a refresh resumes the conversation.

*Consequence for `app` (PR 2):* the frontend keeps no history and no message store. It renders what
`useAgentChat` gives it and keeps only `sessionId` in `localStorage`. The plan already says this;
Decision 3 is what makes it true.

*Recorded for later:* if history ever needs to be queried outside its own Durable Object (analytics,
an admin view), D1 becomes the right answer. That is a future change, noted in the plan's "Fora
d'abast".

### Decision 4 — Retrieval as a tool the model calls, not a hardcoded step

`scan-cv` is defined with `tool()` from `ai`: description + Zod `inputSchema` + `execute`. It is
passed to `streamText`/`generateText` in a record, `{ "scan-cv": scanCVTool }`. The SDK converts the
Zod schema to JSON schema for the model, validates the model's input against it before `execute`
runs, feeds the result back, and `stopWhen: stepCountIs(n)` caps the loop.

*Alternatives considered:*

- **Retrieve first, always, then prompt with the chunks** (classic RAG, no tool). Simpler, cheaper
  by one round trip, and fully deterministic. Rejected for the reason the plan gives: it retrieves
  for "hello" and for "what's the weather", and it demonstrates none of the tool-use literacy the
  challenge rewards. It is also strictly less capable — the model cannot search twice with a
  refined query.
- **A hand-rolled dispatcher** (`onToolCall`, a switch on the tool name, manual JSON schema).
  Rejected: it re-implements schema generation, input validation and the step loop, and the schema
  would drift from the TypeScript type. `tool()` keeps description, schema, type and execution in
  one place.

*Trade-off accepted:* the model may decline to call the tool when it should, so "did it search?" is
now a behavior worth testing. The orchestration tests cover both branches, and PR 3's `toolUsage`
scorer grades it on the golden dataset.

### Decision 5 — One orchestration core, two entry points

`orchestration/query.ts` exports `streamAgent` (`streamText`) and `runAgent` (`generateText`), both
taking `{ model, messages, maxSteps }` and both passing the *same* `SYSTEM_PROMPT` and the *same*
`tools` record. The Worker path calls `streamAgent`; PR 3's eval calls `runAgent`.

*Alternative considered:* let the eval drive the Worker over HTTP, so there is only one path.
Rejected: it makes every eval run depend on a live `wrangler dev`, and streaming responses would
have to be reassembled before scoring. Two thin exports over one shared configuration is the
cheaper way to guarantee the eval grades the same agent the user talks to.

*Constraint this imposes:* the system prompt, the tool record and the step cap must live at module
scope in `orchestration/`, never inside `ScannerAgent`. If a future change needs per-session prompt
variation, it arrives as a parameter to both functions.

### Decision 6 — `retrieve` gains optional caller-supplied credentials

`retrieve` currently calls `requireUpstashCredentials()`, which reads `process.env`. **A Worker has
no `process.env`** unless `nodejs_compat` is enabled, and even then it is a shim. So `retrieve`'s
signature becomes:

```ts
retrieve(query, { topK, credentials }): Promise<RetrievedResult[]>
```

`credentials` is optional; omitted, it falls back to `requireUpstashCredentials()` exactly as today,
so `pnpm ingest:cvs` and every existing `rag` test are unaffected. The Worker passes
`{ url: env.UPSTASH_VECTOR_REST_URL, token: env.UPSTASH_VECTOR_REST_TOKEN }` explicitly.

This modifies the ratified `rag-retrieval` spec, so it ships as a delta spec in this change, not as
an undocumented edit.

*Alternatives considered:*

- **`nodejs_compat` + secrets exposed on `process.env`.** Zero change to `rag`. Rejected: it makes
  a module boundary depend on a compatibility flag and a Node shim, and it hides where credentials
  come from. An explicit parameter is the same amount of code in the Worker and honest about the
  dependency.
- **`agent` builds its own Upstash index** and skips `retrieve`. Rejected outright: it duplicates
  `rag`'s store wrapper and breaks architecture.md §2's "`agent` only calls `rag`'s retrieval
  interface".

### Decision 7 — Citations get the candidate's name from vector metadata, not from `manifest.json`

The plan has `extraction/extract-sources.ts` resolve `candidateId` → candidate name by reading
`data/manifest.json`. That cannot work and should not work:

1. **It cannot** — there is no `fs` in a Worker.
2. **It should not** — `docs/architecture.md` §2 says the manifest is "a test/validation aid, not a
   runtime dependency", and the `rag-retrieval` spec has an explicit requirement that the manifest
   is not consulted at query time. Moving that read into `agent` would honour the letter and break
   the intent.

Instead, ingestion — which already reads the manifest, on Node, where `fs` exists — writes the
candidate's `name` into the vector's metadata, and `retrieve` returns it as `candidateName`. Source
extraction then becomes a pure function over tool results: no `fs`, no manifest, no I/O.

Cost: `VectorMetadata` and `RetrievedResult` each gain a field, and the index must be rebuilt once
with `pnpm ingest:cvs` (25 vectors, seconds, and the pipeline is already idempotent by
reset-and-rebuild). Both `rag` specs get a delta.

*Alternatives considered:*

- **`import manifest from "@data/manifest.json"`**, bundled by esbuild (`resolveJsonModule` is
  already on). Works in a Worker and touches no `rag` code. Rejected: it makes the dataset a
  *build-time* dependency of the agent — regenerate the CVs and the Worker serves stale names until
  re-bundled — and it still puts manifest knowledge in a module that architecture.md says should not
  have it.
- **Cite `candidateId` + PDF path only**, and let the UI prettify the slug. Cheapest: no `rag`
  change, no re-ingest. Rejected: `nikita-crist` → "Nikita Crist" works until a name has a
  particle, an accent or a hyphen, and the real name is sitting right there in the manifest. A
  citation that misspells the candidate is worse than no citation.

### Decision 8 — `SourceReference` shape, and who builds the URL

```ts
interface SourceReference {
  candidateId: string;    // join key, and the React list key
  candidateName: string;  // what the user reads
  source: string;         // repo-relative PDF path, e.g. data/cvs/nikita-crist.pdf
  score: number;          // the retrieval score that put it here
}
```

Sources are derived from the **tool results of the turn**, de-duplicated by `candidateId`, keeping
the highest score, ordered by descending score. A turn where the model called no tool has zero
sources — and that is a correct answer for "hello", not a failure.

`source` stays a repo-relative path, not a URL. The plan's `pdfUrl` is deliberately not here:
`agent` does not know how PR 2 serves `data/cvs/`, and inventing an origin in the backend is how a
frontend concern leaks into an API contract. PR 2 maps path → URL.

*Alternative considered:* letting the model emit its own citations in structured output (JSON mode).
Rejected — the plan's own risk table flags LLM-side citation parsing as fragile, and it is: the tool
results already record exactly which CVs the model saw, with no parsing and no chance of a
hallucinated source. Deriving citations mechanically is both cheaper and strictly more trustworthy.

### Decision 9 — Groundedness: a permanent prompt constraint plus temporary audit logging

Per the plan's decision 2: enforcement is the system prompt (answer only from `scan-cv` results;
say so when the corpus does not contain the answer; never invent a candidate), plus logging of
(question, retrieved candidateIds, answer) for manual audit.

The **logging is explicitly temporary**. PR 3's Braintrust `groundedness` scorer replaces it, and
this change must make that removal mechanical rather than archaeological: every function, call site,
type and test belonging to the audit logging carries the exact marker

```
// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
```

so PR 3's closing check is `grep -rn "TODO(add-agent-evals)" src/` returning nothing.

*Alternatives considered:*

- **Post-hoc heuristic verification** (check the answer's claims against chunk text). Rejected:
  substring matching cannot tell a paraphrase from a fabrication, so it would fail on correct
  answers and pass on plausible wrong ones.
- **A second LLM call to grade each answer.** Rejected *here* and adopted *there* — it is precisely
  what PR 3 does, off the request path, where latency and cost are irrelevant. Doing it inline would
  double the cost and latency of every user turn.

### Decision 10 — Context compaction is ours; storage trimming is the SDK's

Two different things the plan conflates. `maxPersistedMessages` caps how many messages the DO
*stores*. Compaction caps how many *reach the model*: over 10 turns, keep the most recent 5 verbatim
and replace the older ones with a single summary message.

Compaction therefore lives in `orchestration/`, applied to the message array before
`streamAgent`/`runAgent`, not in the Durable Object — which keeps it (a) unit-testable with no DO
and (b) identically applied on the eval path. The stored history stays complete; only the
model-facing view is compacted.

*Alternatives considered:*

- **`maxPersistedMessages` alone.** Rejected: it throws history away permanently to solve a context
  problem, so a resumed session would have genuinely lost its early turns.
- **No compaction, rely on the context window.** Defensible — a CV chat is unlikely to run 50 turns.
  Rejected as an explicit plan requirement, and the summarizing step is small.

*Trade-off:* summarizing costs an extra LLM call on the turn that crosses the threshold. Acceptable,
and the threshold is a named constant so it can be raised.

### Decision 11 — Module layout: directory-per-concern, colocated tests, one root entry

The plan sketches `src/agent/__tests__/` mirroring the tree, and both `index.ts` and `worker.ts` at
the root. Both conflict with `docs/code-conventions.md` ("a colocated `*.test.ts` stays next to the
file it tests"; only the module entrypoint sits at the root). Corrected:

```
src/agent/
  index.ts                            # the Worker entry — what wrangler's `main` points at
  env/agent-env.ts                    # Env binding contract (secrets + DO namespace), fail-fast
  clients/llm-client.ts               # the only file importing @ai-sdk/openai
  chat/scanner-agent.ts               # ScannerAgent extends AIChatAgent
  tools/scan-cv.ts                    # tool(): description + inputSchema + execute
  tools/index.ts                      # the record { "scan-cv": scanCVTool }
  orchestration/query.ts              # streamAgent + runAgent
  orchestration/system-prompt.ts
  orchestration/compaction.ts         # Decision 10
  orchestration/types.ts              # AgentResult, SourceReference
  extraction/extract-sources.ts       # tool results -> SourceReference[]
```

Each with a colocated `*.test.ts`. `index.ts` holds the Worker's `fetch` and re-exports
`ScannerAgent` (Wrangler requires the DO class to be exported from the entry module) — it is the
boundary Wrangler points at, exactly as `src/feed/index.ts` is what `generate:cvs` runs.

*Alternative considered:* the plan's `worker.ts` + `index.ts` pair, with `index.ts` as a barrel of
public exports. Rejected: two root files where one suffices, and neither `feed` nor `rag` has a
barrel — `rag`'s consumers import `@rag/retrieval/retrieve` directly, so a barrel here would be a
new convention for one caller.

*Spec naming:* the plan's `specs/agent-core/` is renamed `specs/agent-orchestration/`, and citations
are split into `specs/agent-sources/`. "Core" is the kind of generic bucket name
`docs/code-conventions.md` rejects for directories, and source indication is a named requirement in
`CHALLENGE.md` — it deserves a spec that can be traced, not a subsection.

### Decision 12 — Testing: mock at the model seam, no credentials in CI

`@ai-sdk/openai@4` implements `LanguageModelV4`, so tests inject `MockLanguageModelV4` from
`ai/test` (with `simulateReadableStream` for the streaming path) as the `model` argument. Because
Decision 5 made `model` a parameter, no network call and no API key is reachable from the suite.
`scan-cv`'s `execute` is tested directly with `retrieve` mocked, as `rag`'s own tests do.

*Alternatives considered:*

- **`@cloudflare/vitest-pool-workers`**, running tests inside workerd with real DO storage.
  Rejected for PR 1: it adds a second Vitest project and a workerd boot to every run, to test the
  one part of the module (SDK persistence) we did not write. `pnpm dev:agent` plus a manual question
  is the honest check for the DO wiring, and it is already in the PR's closing checklist.
- **Recorded HTTP fixtures against the real OpenAI API.** Rejected: fixtures go stale silently and
  a model change invalidates them, while `MockLanguageModelV4` tests our orchestration, which is
  what we actually wrote.

### Decision 13 — Scope is enforced in the system prompt, and a decline is a normal turn

The agent answers questions about the CV collection. Anything else — the weather, a poem, a pasted
bug — gets a polite reply saying it is outside scope and naming what the assistant does cover
(spec `agent-orchestration`). That boundary lives in `SYSTEM_PROMPT`, next to the groundedness
contract, because the two are the same instruction seen from different sides: *only* the corpus, and
*nothing but* the corpus.

Three properties make this a prompt-level policy rather than a gate in front of the model:

1. **A decline must be a successful turn**, streamed and persisted like any other. Treating it as an
   error would make the UI render a failure for a correct behavior.
2. **A mixed request must be split** — "which candidates know Python, and what salary should I offer?"
   answers the first half from the corpus and declines the second in the same reply. Only the model
   generating the answer can do that.
3. **A decline must be in the user's language.** The corpus is Catalan/Spanish/English and so are the
   questions; a fixed refusal string would answer a Catalan question in English.

*Alternatives considered:*

- **A classifier pre-step** (a cheap model labels each turn in-scope/out-of-scope before the main
  call). Rejected on all three properties above: it cannot express a partial decline, it adds a round
  trip to every turn including the ordinary ones, and its false positives are worse than the failure
  it prevents — refusing a legitimate CV question is a more damaging bug than occasionally answering
  an off-topic one.
- **`toolChoice: "required"`, forcing `scan-cv` every turn**, on the theory that a model with
  retrieval results will stay on topic. Rejected: it retrieves for "hello", contradicts Decision 4's
  reason for existing, and does not even work — nothing stops the model from running a pointless
  search and then answering the weather anyway.
- **A keyword or regex gate** before the model. Rejected: "who knows Rust?" and "how do I write Rust?"
  share every keyword that matters, so the gate would have to understand the sentence, which is the
  model's job.

*Trade-off accepted:* a prompt is not a security boundary. A determined user can probably talk the
model out of scope, and this design does not pretend otherwise. That is acceptable because the
failure mode is an off-topic answer, not harm or data exposure — and it is measurable rather than
hypothetical: the eval dataset's `off-topic` category is exactly this behavior, so a prompt change
that weakens the boundary shows up as a score regression instead of as a user complaint.

### Decision 14 — `.env` is the only environment file. No `.dev.vars`

Every variable in this repo lives in `.env`, for both runtimes. The Worker does **not** get a
second secrets file.

This corrects an assumption inherited from the plan ("`.dev.vars` per a `wrangler dev`"), which was
true of older Wrangler and is not true of the version this change pins. Verified against
`wrangler@4.141.0`'s own build:

- `getDefaultEnvFiles()` returns `[".env", ".env.local"]`, and `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV`
  is a boolean flag with `defaultValue: true` — so `.env` is read with no flag and no configuration.
- Each loaded value is registered as a `secret_text` binding, so it arrives on the Worker's `env`
  object. Note it arrives as a **binding**, not on `process.env` inside the Worker — which is exactly
  why Decision 6 passes credentials explicitly rather than relying on a Node shim.
- A global middleware also loads `.env` into Wrangler's own `process.env`, so `wrangler` subcommands
  see the same values.

**The decisive detail:** secret loading tries `.dev.vars` **first**, and falls back to `.env` only
when that yielded nothing. A `.dev.vars` sitting in the repo would therefore *shadow* `.env` —
silently, and only for the Worker, so `pnpm ingest:cvs` and the tests would keep reading the `.env`
value while the agent read a different one. Two files holding the same secrets, where the stale one
wins and nothing says so, is a bug waiting for the first time someone rotates a key in the obvious
place. Not creating the file removes the failure mode entirely.

*Alternatives considered:*

- **`.dev.vars`**, the convention Wrangler's own scaffolding and most tutorials still show. Rejected:
  it duplicates every secret across two gitignored files kept in sync by hand, for zero capability —
  and, per the shadowing above, it is actively worse than nothing here.
- **`wrangler dev --env-file .env`.** The flag exists and would work, but it makes explicit what is
  already the default, so it is noise in the `dev:agent` script that a future reader would have to
  look up.
- **`wrangler secret put`.** Rejected: that targets a deployed Worker, and Decision 1 deploys nothing.

*Consequence:* `.env` holds all five variables, and `.env.example` documents which runtime reads each
(`GEMINI_API_KEY` → `feed` only; `UPSTASH_VECTOR_REST_*` → `rag`, from Node and from the Worker;
`OPENAI_API_KEY` → the agent). `.gitignore` must cover `.env*` while keeping `.env.example` tracked,
and must **not** gain a `.dev.vars` entry — an ignore rule for a file we have decided never to create
is an invitation to create it.

## Risks / Trade-offs

- **`OPENAI_API_KEY` becomes a runtime credential**, having been a console-setup credential nothing
  read. Verified working against the live API while writing this design. → It stays in `.env` alone
  (Decision 14), so there is no second copy to drift; `.env.example` documents which runtime reads
  which variable, and `AGENTS.md` §2 has to stop calling the key console-only. Every automated test
  still passes without it (Decision 12), so a lapsed key breaks the manual check and nothing else.
- **The Cloudflare Agents SDK is young and moves fast** (`agents@0.24.0`, `@cloudflare/ai-chat@0.12.0`
  — both pre-1.0), and we depend on internal-ish behavior: SQLite persistence and the `onChatMessage`
  contract. → Versions are exact-pinned per repo policy. Our own logic sits in `orchestration/`,
  `tools/` and `extraction/`, all free of SDK imports, so an SDK break is confined to
  `chat/scanner-agent.ts` and `index.ts`.
- **`nodejs_compat` may turn out to be needed anyway** — `@upstash/vector` is `fetch`-based and
  should run clean on workerd, but this is unverified until the Worker actually boots. → Decision 6
  removes the *credential* reason to need it; if a transitive Node built-in forces the flag, adding
  it is a one-line config change that invalidates none of these decisions.
- **Tool-use non-determinism**: the model decides whether to search, so the same question can take a
  different path across runs. → Both branches are unit-tested with a mocked model; PR 3's
  `toolUsage` scorer with `trialCount > 1` measures it on real traffic.
- **Two runtimes to keep in sync** (Node for `ingest:cvs` and tests, workerd for the agent), with
  different module resolution and different ways of reaching the same credential — `process.env` in
  Node, an `env` binding in the Worker. → One `.env` feeds both (Decision 14), `rag`'s Worker-facing
  surface is one function taking credentials explicitly (Decision 6), and the alias set stays
  identical because Wrangler reads `tsconfig.json` paths.
- **The scope boundary is a prompt, not a guarantee** (Decision 13): a user who insists can likely get
  an off-topic answer, and a model upgrade could quietly loosen the boundary. → Both the plain
  off-topic case and an override attempt are unit-tested with a mocked model, so a prompt edit that
  drops the instruction fails the suite; PR 3's `off-topic` category measures it against the real
  model, where a mocked test cannot.
- **Compaction can lose a fact the user referred back to** ("the second candidate you mentioned"). →
  The summary keeps candidate names and ids, the threshold keeps 5 recent turns verbatim, and stored
  history stays complete so a better strategy can be applied later without data loss.

## Migration Plan

Additive for `agent`; two small, backward-compatible edits to `rag`.

1. `OPENAI_API_KEY` is already in `.env` and verified against the live API. Nothing else to do —
   Wrangler reads `.env` (Decision 14), so there is no second file to populate.
2. `rag` edits: `name` into `VectorMetadata` and `candidateName` into `RetrievedResult`; optional
   `credentials` on `retrieve`. Both are additive — existing callers compile unchanged.
3. **Re-run `pnpm ingest:cvs`** so the 25 vectors carry `name`. Until then, `candidateName` is
   absent from live results; the gated ground-truth test is what catches a forgotten re-ingest.
4. `pnpm dev:agent`, ask a real question, confirm a grounded answer with sources.

*Rollback:* delete `src/agent/`, `wrangler.jsonc` and the `dev:agent` script. The `rag` edits are
harmless if left (optional parameter, one extra metadata field); reverting them additionally needs
one `pnpm ingest:cvs`. `feed`, the dataset and `pnpm test` are unaffected throughout.

## Open Questions

- ~~The exact OpenAI model id~~ — resolved in Decision 2: `gpt-5.4-mini-2026-03-17`, confirmed
  present in the account's model list and confirmed to emit a well-formed `function_call` for a
  Catalan question. What remains open is not the id but whether the mini tier holds the groundedness
  constraint under pressure, which PR 3's scorers measure and no amount of design can settle.
- **Default `topK` for `scan-cv`.** Starting at 5 (`rag`'s own open question, inherited). PR 3's
  `sourceRecall`/`sourcePrecision` scorers are what should actually settle it.
- **The compaction threshold** (10 turns) and retained-turn count (5) are guesses. No CV
  conversation in testing has come near them; they are named constants, to be tuned if a real
  session does.
- **Session id origin.** `routeAgentRequest` derives the DO name from the request path, and PR 2
  keeps a `sessionId` in `localStorage`. Whether the agent should also accept a server-generated id
  is deferred to PR 2, where the client actually exists.
