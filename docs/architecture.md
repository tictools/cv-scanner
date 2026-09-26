# Architecture

> **Living document.** This file evolves throughout each module's lifecycle — it is not a
> one-off snapshot. It currently sketches the system shape derived from
> [CHALLENGE.md](../CHALLENGE.md); the `feed`, `rag`, `agent`, and `app` modules are **not yet
> designed** — the sections below are open questions to resolve, ideally via an
> [OpenSpec](https://github.com/Fission-AI/openspec) proposal per module (see `AGENTS.md`).
> Update this file as those proposals land instead of letting the design live only in chat.

## 1. What the system must do

From `CHALLENGE.md`:

- Let a user ask natural-language questions about a set of ~25-30 CVs and get answers.
- Answers must be **grounded in the CV content only** (no invented candidate facts).
- Optional: indicate **which CVs** were used as sources for a given answer.
- No hosting/deployment requirement — local execution is enough.
- Stack is a free choice; the task rewards a working product over rigid process, but also
  rewards clear thought process, code quality and AI literacy — so architectural decisions
  should be simple, justified, and documented (hence this file, kept up to date per module).

## 2. High-level shape

**Decided initial project structure** (single package, no monorepo):

```
./data/            # generated artifacts: CVs (PDFs), photos, manifest.json — not code
./src/
  ├── feed/        # CV generation pipeline (data generation)
  ├── rag/         # ingestion + retrieval: PDF text extraction, chunking, embeddings, vector search
  ├── agent/       # orchestration: question + retrieved context → grounded answer + sources
  └── app/         # frontend / chat UI
```

Four modules in a pipeline, each independently designed/documented and loosely coupled through
`data/` and narrow interfaces — not through shared runtime code:

```
feed ──writes──▶ data/ (PDFs, manifest.json)
                    │
                    ▼ reads
                  rag  ──retrieved chunks──▶ agent ──answer + sources──▶ app
                                              ▲                            │
                                              └────────── question ───────┘
```

- **`feed`** — not designed yet. Generates fake CVs as PDFs plus a `manifest.json` ground
  truth into `data/`.
- **`rag`** — not designed yet. Owns ingestion and retrieval only: PDF text extraction,
  chunking, embeddings, vector storage/similarity search. Returns retrieved chunks, not
  answers.
- **`agent`** — not designed yet. Owns the answer: takes the user's question plus `rag`'s
  retrieved chunks, calls the LLM to produce a grounded answer, and assembles source
  references (candidate/PDF) from the chunks used. This is where groundedness/source-indication
  behavior lives, kept separate from raw retrieval mechanics.
- **`app`** (frontend) — not designed yet. Owns the UI (input + answer display) and calls into
  `agent`'s query interface (in-process function call vs. HTTP API — open question, see below).

The boundary between modules is **data and narrow interfaces**, not shared code: `feed` writes
to `data/`; `rag` reads from `data/` (the manifest is a test/validation aid, not a runtime
dependency); `agent` only calls `rag`'s retrieval interface; `app` only calls `agent`'s query
interface. This keeps each module replaceable/rewriteable independently — external API access
(e.g. the LLM provider) should stay isolated behind a thin `client/` wrapper per module rather
than shared across them.

## 3. Cross-cutting decisions (made so far)

- **LLM provider**: Gemini (Google AI Studio, free tier), single key, used for both text and
  image generation in `feed`. Whether `rag`/`agent` reuse Gemini (e.g. for embeddings and/or the
  answer-generation model) or introduce a second provider is an open question below — if a
  second provider is introduced, it must stay isolated behind its own `client/` wrapper, same
  pattern as `feed`.
- **Runtime**: Node.js + TypeScript, ESM, pnpm. Single package, not a monorepo — `feed`, `rag`,
  `agent`, `app` are sibling folders under `src/`, with generated artifacts under top-level
  `data/` (not under `src/`, since it's data, not code).
- **Import path aliases**: intra-repo imports use fixed aliases rooted at each module and at the
  data directory — `@feed/*` → `src/feed/*`, `@rag/*` → `src/rag/*`, `@agent/*` → `src/agent/*`,
  `@app/*` → `src/app/*`, `@data/*` → `data/*` — never deep relative chains (`../../`). Declared
  in `tsconfig.json` (`compilerOptions.paths`), which is compile-time only: the dev/test runners
  must resolve the same aliases at runtime (Vitest via its config, a TS runner such as `tsx` for
  scripts). Aliases don't change module coupling: cross-module imports still only happen through
  the narrow interfaces above (e.g. `agent` importing `@rag`'s public entry point), never into a
  sibling module's internals.
- **No deployment target**: architecture should optimize for "runs locally with `pnpm install`
  + a `.env`", not for scaling, multi-tenancy, or hosting concerns.

## 4. Open questions (to resolve, ideally one OpenSpec proposal per module)

### RAG pipeline (`src/rag`)
- PDF text extraction library (e.g. `pdf-parse`, `pdfjs-dist`, or reuse of anything already
  pulled in by `feed`'s Puppeteer dependency).
- Chunking strategy (per-section vs. fixed-size windows) — CVs have fairly clean structure
  (contact/experience/education/skills), which may allow structure-aware chunking instead of
  naive splitting.
- Embedding model/provider and vector store (in-memory array + cosine similarity is likely
  sufficient for ~30 documents; a dedicated vector DB is probably over-engineering for this
  dataset size — needs an explicit decision, not a default).
- Retrieval strategy (top-k similarity vs. also using `manifest.json`-style structured
  filtering during development/validation only, never at answer time, to keep answers grounded
  in the PDF text and not in the ground truth).
- Shape of the chunk returned to `agent` (must carry enough metadata — source PDF/candidate —
  for source indication downstream).

### Agent (`src/agent`)
- How source indication (optional requirement) is carried from retrieved chunks into the
  final answer (chunk → source PDF/candidate mapping).
- How groundedness is enforced (prompt constraints only, or a stricter check against retrieved
  context before answering).
- Whether `agent` reuses Gemini or a different model for answer generation.

### App / frontend (`src/app`)
- Framework choice (kept minimal — plain server-rendered page, or a small SPA).
- How `app` talks to `agent`: direct in-process call (single Node process, since the project is
  a single package — see decided structure above) vs. exposing a small local HTTP endpoint.
- Whether/how source indication is rendered (e.g. citing candidate name + PDF link per answer).

## 5. Non-goals

- Authentication, multi-user support, or persistence beyond local files/CVs.
- Horizontal scaling, hosting, or production-grade observability — explicitly out of scope per
  `CHALLENGE.md` ("does not need to be deployed or hosted online").
