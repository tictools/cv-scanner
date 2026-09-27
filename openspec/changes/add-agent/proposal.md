# Proposal: add-agent

## Why

`rag` made 25 CVs searchable, but nothing answers a question yet. `agent` is the module that turns
a question plus retrieved CV text into a **grounded answer with sources** — the actual deliverable
of `CHALLENGE.md`. It also unblocks the rest of Fase 3: `app` consumes its Worker, and the eval
harness calls its core function directly.

## What Changes

- New **`agent`** module under `src/agent/`: a Cloudflare Worker whose `ScannerAgent` Durable
  Object (`AIChatAgent` from `@cloudflare/ai-chat`) streams answers over the AI SDK.
- **Retrieval reaches the LLM as a tool**, not a hardcoded call: `scan-cv`, defined with `tool()` +
  Zod, so the model decides when to search. Adding a tool becomes one file plus one record entry.
- **One orchestration core, two entry points**: `streamAgent` (Worker) and `runAgent` (evals) share
  the same system prompt, tool record and step limit, so they cannot drift.
- **Sources come from tool results only** — no filesystem and no `manifest.json` at runtime, which
  keeps `docs/architecture.md` §2's "the manifest is a test aid, not a runtime dependency" true.
- **A defined scope**: anything the CV collection cannot answer gets a polite reply saying so and
  naming what the assistant does cover — never a general-knowledge answer, and never a bare refusal.
- **Chat history lives in the Durable Object's own SQLite**, persisted by the SDK. This corrects the
  plan's "PostgreSQL (D1)": D1 is SQLite, not Postgres, and a D1 binding would be a redundant
  second store.
- **Amends `docs/architecture.md` §3**: a second runtime (`wrangler dev`) joins "runs locally with
  `pnpm install` + a `.env`", and `OPENAI_API_KEY` becomes a runtime credential.

## Capabilities

### New Capabilities

- `agent-orchestration` (module: **agent**): the question → grounded answer loop — Worker routing,
  the `ScannerAgent` Durable Object, streaming, persisted history with compaction, the groundedness
  and scope contracts, and the `runAgent` core the evals reuse.
- `agent-tools` (module: **agent**): the `scan-cv` tool contract — schema, validation, error
  posture, and what it takes to add the next tool.
- `agent-sources` (module: **agent**): how a citation is derived from tool results and what shape
  reaches `app`.

### Modified Capabilities

- `rag-retrieval` (module: **rag**): `retrieve` accepts optional caller-supplied credentials (a
  Worker has no `process.env`), and each result carries `candidateName` so citations name a person
  without reading the manifest.
- `rag-ingestion` (module: **rag**): the indexed vector's metadata gains the candidate's `name`.
  Requires one re-run of `pnpm ingest:cvs`.

## Impact

- **Code**: new `src/agent/` tree with colocated tests; small edits to `src/rag/` (retrieval
  signature, result shape, ingestion metadata) and their tests.
- **Config**: `ai`, `@ai-sdk/openai`, `agents`, `@cloudflare/ai-chat` deps + `wrangler` and
  `@cloudflare/workers-types` dev deps; `wrangler.jsonc`; `pnpm dev:agent`; `.env.example`.
  `OPENAI_API_KEY` is in place and verified. `.env` stays the single environment file — Wrangler reads
  it natively, so no `.dev.vars`.
- **Docs**: `AGENTS.md` §1/§2/§3/§4, `docs/architecture.md` §3/§4, new `context/agent.md`.
- **Other modules**: `app` (PR 2) and the eval harness (PR 3) both depend on this landing first.

## Non-goals

- Any UI. `agent` exposes an HTTP/WebSocket surface and nothing else.
- The eval harness and Braintrust scorers (PR 3) — including the groundedness scorer that will
  replace this change's temporary audit logging.
- Deployment to Cloudflare. `wrangler dev` locally is the only target.
- Extra tools (`filter-candidates`, `compare-candidates`, …), auth, multi-user sessions, and
  re-ranking or score thresholds inside retrieval.
