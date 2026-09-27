# Proposal: add-rag-retrieval

## Why

`feed` produced 25 CV PDFs, but nothing can read them yet. The chat app can only answer grounded
questions once those PDFs are searchable, so `rag` is the blocking next module: it must turn the
PDF dataset into a vector index and expose a narrow retrieval interface for `agent` to call.

## What Changes

- New **`rag`** module under `src/rag/`, in two halves:
  - **Ingestion** — a one-shot `pnpm ingest:cvs` script: read `manifest.json` for
    `candidateId`/`pdfPath` pairs, extract each PDF's text, upsert one vector per candidate into
    the store. Resets the index first, so re-runs are idempotent.
  - **Retrieval** — `retrieve(query, { topK })` → ranked `{ candidateId, source, content, score }`,
    the only surface `agent` imports.
- **Vector store: Upstash Vector**, with Upstash-hosted embeddings — no separate embedding API
  call, and no local similarity code to maintain. Resolves the `docs/architecture.md` §4 open
  questions on embeddings/vector store.
- **One vector per CV, no chunking.** Measured the real extracted PDF text: 138-392 words
  (avg 258), every CV a single page — far below any threshold that would justify splitting.
- **PDF extraction: `unpdf`** — ESM-first, bundled types, verified against all 25 files.
- Ingestion reads the **PDFs**, never `data/content/*.json`; the manifest supplies only file
  paths and, separately, ground truth for a gated retrieval integration test.
- Unit-tested test-first per `docs/tdd.md`; Upstash mocked in unit tests.

## Capabilities

### New Capabilities

- `rag-ingestion` (module: **rag**): PDF text extraction, normalization, and idempotent indexing
  of one vector per candidate, with per-candidate error isolation.
- `rag-retrieval` (module: **rag**): the ranked-results query interface `agent` consumes, carrying
  the source metadata needed for citations.

### Modified Capabilities

<!-- None — `feed-cv-generation`'s requirements are unchanged; `rag` only consumes its output. -->

## Impact

- **Code**: new `src/rag/` tree plus unit tests and one gated integration test.
- **Config**: `@upstash/vector` + `unpdf` deps; `ingest:cvs` script;
  `UPSTASH_VECTOR_REST_URL`/`UPSTASH_VECTOR_REST_TOKEN` in `.env`.
- **Docs**: `AGENTS.md` §2/§3, `docs/architecture.md` §4 RAG open questions → decided.
- **Other modules**: none yet — `agent` consumes `rag-retrieval` in a later proposal.

## Non-goals

- LLM tool-calling wrapper (`searchKnowledge`-style) — belongs to `agent`.
- Eval/scoring harness — nothing to grade until `agent` produces answers.
- Chunking, re-ranking, hybrid/keyword search, incremental re-indexing.
