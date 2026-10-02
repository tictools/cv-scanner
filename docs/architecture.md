# Architecture

> **Living document.** This file evolves throughout each module's lifecycle — it is not a
> one-off snapshot. It currently sketches the system shape derived from
> [CHALLENGE.md](../CHALLENGE.md); `feed`, `rag`, `agent`, and `app` are all designed and
> implemented. Update this file as future proposals land instead of letting the design live only in
> chat.

## 1. What the system must do

From `CHALLENGE.md`:

- Let a user ask natural-language questions about a set of ~25-30 CVs and get answers.
- Answers must be **grounded in the CV content only** (no invented candidate facts).
- Optional: indicate **which CVs** were used as sources for a given answer.
- No hosting/deployment requirement — local execution is enough.
- Stack is a free choice; the task rewards a working product over rigid process, but also
  rewards clear thought process, code quality and AI literacy — so architectural decisions
  should be simple, justified, and documented (hence this file, kept up to date per module).
- **Product behavior `CHALLENGE.md` doesn't state but the product needs**: a request the CV
  collection cannot serve gets a polite, in-scope decline — never a general-knowledge answer,
  and never a bare refusal. Decided and implemented as part of `agent`
  (see [openspec/changes/add-agent/design.md](../openspec/changes/add-agent/design.md) Decision 13).

## 2. High-level shape

**Decided initial project structure** (single package, no monorepo):

```
./data/            # generated artifacts: CVs (PDFs), photos, manifest.json — not code
./src/
  ├── feed/        # CV generation pipeline (data generation)
  ├── rag/         # ingestion + retrieval: PDF text extraction, chunking, embeddings, vector search
  ├── agent/       # orchestration: question + retrieved context → grounded answer + sources
  ├── app/         # frontend / chat UI
  └── shared/      # not a module: runtime-agnostic code more than one module needs (see §2.1)
```

Four modules in a pipeline, each independently designed/documented and loosely coupled through
`data/` and narrow interfaces — not through shared runtime code (the module-agnostic helpers in
`src/shared/`, §2.1, are the only exception, and carry no module behavior):

```
feed ──writes──▶ data/ (PDFs, manifest.json)
                    │
                    ▼ reads
                  rag  ──retrieved CVs──▶ agent ──answer + sources──▶ app
                                              ▲                            │
                                              └────────── question ───────┘
```

How they connect is [context/workflow.md](../context/workflow.md).

- **`feed`** — designed and implemented; see
  [openspec/changes/archive/2026-09-26-add-cv-generation/design.md](../openspec/changes/archive/2026-09-26-add-cv-generation/design.md).
  Generates fake CVs as PDFs plus a `manifest.json` ground truth into `data/`.
- **`rag`** — designed and implemented; see
  [openspec/changes/archive/2026-09-27-add-rag-retrieval/design.md](../openspec/changes/archive/2026-09-27-add-rag-retrieval/design.md).
  Owns ingestion and retrieval only: PDF text extraction (`unpdf`), one vector per CV (no chunking)
  via Upstash Vector's hosted `openai/text-embedding-3-small` embedding. Returns retrieved CVs, not
  answers.
- **`agent`** — designed and implemented; see
  [openspec/changes/add-agent/design.md](../openspec/changes/add-agent/design.md). Owns the answer: a
  Cloudflare Worker (`ScannerAgent` Durable Object, `wrangler dev` locally) whose model calls `rag`'s
  `retrieve` as a tool it chooses to call, streams a grounded answer, and derives source references
  mechanically from the tool's own results — never from the model's prose. Groundedness and the scope
  boundary are both system-prompt contracts, verified against the real model as well as unit-tested
  against a mocked one.
- **`app`** — designed and implemented; see
  [openspec/changes/archive/2026-09-27-add-app/design.md](../openspec/changes/archive/2026-09-27-add-app/design.md). Owns the chat UI: a
  Vite + React 19 SPA that talks to
  `agent`'s Worker over its existing chat protocol (`useAgent` + `useAgentChat`, proxied by Vite —
  no new HTTP API, no in-process call, since `agent` is a separate Cloudflare Worker process) and
  derives its cited-CVs display mechanically from the same tool results `agent` already streams.

The boundary between modules is **data and narrow interfaces**, not shared code: `feed` writes
to `data/`; `rag` reads from `data/` (the manifest is a test/validation aid, not a runtime
dependency); `agent` only calls `rag`'s retrieval interface; `app` only calls `agent`'s query
interface (its chat protocol), with **one narrow, documented exception**: `app` also imports
`agent`'s pure `extraction/extract-sources.ts` directly (`@agent/extraction/extract-sources`) so
the "what counts as a cited CV" rule is defined once, not restated. That import may never reach for
anything else in `agent` — in particular never `src/agent/index.ts` (the Worker entry), which
would drag `agents` and the `cloudflare:` module scheme into the browser bundle
([openspec/changes/archive/2026-09-27-add-app/design.md](../openspec/changes/archive/2026-09-27-add-app/design.md) Decision 6). This
keeps each module replaceable/rewriteable independently — external API access (e.g. the LLM
provider) should stay isolated behind a thin `client/` wrapper per module rather than shared across
them.

### 2.1 `src/shared/` — cross-module code (decided 2026-10-02, issue #9)

`src/shared/` is the **one** sanctioned home for code that more than one module needs and that
would otherwise be duplicated. It is not a fifth module: it has no entrypoint, no `pnpm` script, and
no behavior of its own — modules call into it, it never calls into a module. It exists because
`feed`, `rag`, and `agent` each reimplemented the same "read a required environment variable, trim
it, fail fast with a message naming it" logic with drifting error messages
([issue #9](https://github.com/tictools/cv-scanner/issues/9)).

Rules for anything placed under `src/shared/`:

- **Runtime-agnostic.** It must run unchanged under Node (`feed`, `rag`, `tsx`, Vitest), the
  Cloudflare Workers runtime (`agent`, `wrangler dev`), and the browser (`app`). So no `process`,
  no `NodeJS.*` types, no `cloudflare:` imports, no DOM globals. Runtime-specific inputs (e.g.
  `process.env` vs. the Worker's `env` binding) are passed in as parameters by the calling module.
- **No imports from `src/feed|rag|agent|app`.** Dependencies point one way: module → shared.
- **No third-party dependencies** unless every importing runtime can bundle them.
- **Still no generic buckets inside it.** `shared` is the only generic name allowed, and only at
  this one top-level position; inside it, code lives in a directory named for its concern
  (`src/shared/env/`), per [code-conventions.md](code-conventions.md#no-loose-files).
- **Earned, not speculative.** Code moves here when a second module actually needs it, mirroring
  the "constants stay private unless another file needs them" rule. Module-specific policy stays in
  the module: each module keeps a thin wrapper that supplies its own runtime input and its own
  command hint.

Current contents:

- `src/shared/env/require-env-var.ts` — `requireEnvVar({ env, name, command })`: trims the value,
  treats blank as missing, and throws the single canonical message
  `Missing required environment variable: <NAME>. Set it in a local .env file before running <command>.`
- `src/shared/env/upstash-credentials.ts` — the `UpstashCredentials` type and
  `requireUpstashCredentials({ env, command })`, built on `requireEnvVar`.

Callers: `feed/env/gemini-api-key.ts` (`process.env`, `pnpm generate:cvs`),
`rag/env/upstash-credentials.ts` (`process.env`, `pnpm ingest:cvs`), and `agent/env/agent-env.ts`
(the Worker `env` binding, `pnpm dev:agent`). `rag` and `agent` both validate the Upstash pair
through the same shared `requireUpstashCredentials`. The difference is *when*: the `agent-tools`
spec requires missing Upstash credentials to surface as a `scan-cv` tool error, not as an exception
thrown before the chat turn starts. So `ScannerAgent` hands the tools a resolver
(`resolveCredentials: () => requireUpstashCredentials(this.env)`), and `scan-cv` calls it inside the
same `try` that turns a failing `retrieve` into an `{ error }` result. `OPENAI_API_KEY` is still
validated eagerly, since the model can't be built without it.

## 3. Cross-cutting decisions (made so far)

- **LLM provider**: Gemini (Google AI Studio, free tier), single key, used for both text and
  image generation in `feed`. `rag` uses no separate embedding provider of its own (Upstash hosts
  the embedding model). `agent` decided a **second** provider, OpenAI, for its answer-generation
  model — see the Agent section in §4 below — isolated behind its own `clients/llm-client.ts`
  wrapper, same pattern as `feed`'s Gemini client.
- **Runtime**: Node.js + TypeScript, ESM, pnpm. Single package, not a monorepo — `feed`, `rag`,
  `agent`, `app` are sibling folders under `src/`, with generated artifacts under top-level
  `data/` (not under `src/`, since it's data, not code).
- **Import path aliases**: intra-repo imports use fixed aliases rooted at each module and at the
  data directory — `@feed/*` → `src/feed/*`, `@rag/*` → `src/rag/*`, `@agent/*` → `src/agent/*`,
  `@app/*` → `src/app/*`, `@shared/*` → `src/shared/*` (§2.1), `@data/*` → `data/*` — never deep
  relative chains (`../../`). Declared
  in `tsconfig.json` (`compilerOptions.paths`), which is compile-time only: the dev/test runners
  must resolve the same aliases at runtime (Vitest via its config, a TS runner such as `tsx` for
  scripts). Aliases don't change module coupling: cross-module imports still only happen through
  the narrow interfaces above (e.g. `agent` importing `@rag`'s public entry point), never into a
  sibling module's internals.
- **No deployment target**: architecture should optimize for "runs locally with `pnpm install`
  + a `.env`", not for scaling, multi-tenancy, or hosting concerns.
  **Amended by `agent`** ([design.md](../openspec/changes/add-agent/design.md) Decision 1): `agent`
  is a Cloudflare Worker + Durable Object, which needs a second local runtime (`wrangler dev`, via
  Workerd) and a `wrangler.jsonc` config file. What survives is the *spirit* — no hosting account, no
  deploy step, `wrangler deploy` untested and unused — and the *letter*, since Wrangler reads the same
  single `.env` natively (no `.dev.vars`, see Decision 14). `OPENAI_API_KEY` moves from a console-setup
  credential (used only once, to authorize Upstash's own embedding call) to a runtime credential the
  Worker reads via an `env` binding.

## 4. Open questions (to resolve, ideally one OpenSpec proposal per module)

### RAG pipeline (`src/rag`) — decided

Resolved by the `add-rag-retrieval` change; full rationale and alternatives considered in
[openspec/changes/archive/2026-09-27-add-rag-retrieval/design.md](../openspec/changes/archive/2026-09-27-add-rag-retrieval/design.md)
(how it connects: [context/workflow.md](../context/workflow.md)):

- **PDF text extraction**: `unpdf` (ESM-first wrapper over `pdfjs-dist`).
- **Chunking strategy**: none — one vector per CV. Measured every real generated CV at
  138-392 words (avg 258), well inside the document-level-embedding band; chunking would
  fragment the two facts every answer needs (name, role). Revisit if a future dataset pushes
  any CV meaningfully past ~500 words.
- **Embedding model/provider and vector store**: Upstash Vector, with Upstash-hosted embeddings
  via the `openai/text-embedding-3-small` model (an OpenAI API key is entered once in the
  Upstash console at index-creation time and stored server-side there — `rag`'s own runtime
  credentials are just the two `UPSTASH_VECTOR_REST_*` variables). No local embedding/similarity
  code, no separate embedding API call from `rag`'s side.
- **Retrieval strategy**: plain top-K similarity via `retrieve(query, { topK })`; no
  manifest-based filtering at query time — `manifest.json` is used only to enumerate ingestion
  inputs and as ground truth for the gated integration test, never to shortcut an answer.
- **Chunk shape**: `{ candidateId, source, content, score }` — `source` is the PDF path (for
  citation), `candidateId` the manifest join key, `content` the normalized CV text, `score` the
  raw similarity (no threshold applied inside `rag`; that's `agent`'s policy).

### Agent (`src/agent`) — decided

Resolved by the `add-agent` change; full rationale and alternatives considered in
[openspec/changes/add-agent/design.md](../openspec/changes/add-agent/design.md)
(how it connects: [context/workflow.md](../context/workflow.md)):

- **Source indication**: mechanical, not model-generated. Sources are derived from the retrieval
  tool's own results for the turn (`extraction/extract-sources.ts`), de-duplicated by candidate and
  sorted by score — never parsed out of the model's answer text, so a hallucinated citation is
  structurally impossible.
- **Groundedness enforcement**: a system-prompt contract (answer only from tool results; admit when
  the corpus has no match; never invent a candidate), plus temporary audit logging
  (`TODO(add-agent-evals)`) for manual review until a later change's Braintrust scorer replaces it.
  No stricter runtime check against retrieved context was added — a second-call verifier was judged
  not worth the added latency/cost on the request path.
- **Answer-generation model**: OpenAI (`gpt-5.4-mini-2026-03-17`, via `@ai-sdk/openai` and the AI
  SDK), not Gemini — the groundedness/scope instruction-following this module depends on was the
  deciding factor, and the model choice sits behind `clients/llm-client.ts`, the one file that knows
  the provider.

### App / frontend (`src/app`) — decided

Resolved by the `add-app` change; full rationale and alternatives considered in
[openspec/changes/archive/2026-09-27-add-app/design.md](../openspec/changes/archive/2026-09-27-add-app/design.md)
(how it connects: [context/workflow.md](../context/workflow.md)):

- **Framework choice**: a small SPA — Vite + React 19, no meta-framework, no router (one screen), no
  component library, no state library (`useState`/`useContext` only). React is not a free choice
  here: `@cloudflare/ai-chat` and `agents` both declare `react@^19` as a peer, and choosing the UI
  framework is really choosing to use the agent SDK's own chat client instead of hand-rolling its
  wire protocol.
- **How `app` talks to `agent`**: neither in-process call nor a new HTTP endpoint — `agent` is
  already a separate Cloudflare Worker process (`wrangler dev`), so `app` opens the same
  WebSocket/chat protocol a person's browser would, via `useAgent` + `useAgentChat`, proxied
  same-origin by Vite (`server.proxy`, `ws: true`) so no CORS configuration is needed on the Worker.
- **Source indication**: a dedicated source panel, and only there — the conversation itself stays
  prose. The panel lists the most recent answered turn's candidates one per row, each showing the CV's
  generated portrait beside the candidate's name, the name linking to the generated PDF (both served
  by pointing Vite's `publicDir` at the repo's `data/`). Sources are *derived*, not transported: `app`
  reuses `agent`'s own `extractSources` over the `tool-scan-cv` parts the stream already carries, so no
  citation can be hallucinated and no new data has to cross the wire.

## 5. Non-goals

- Authentication, multi-user support, or persistence beyond local files/CVs.
- Horizontal scaling, hosting, or production-grade observability — explicitly out of scope per
  `CHALLENGE.md` ("does not need to be deployed or hosted online").
