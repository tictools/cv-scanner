# Design: add-rag-retrieval

## Context

`feed` is implemented and has written 25 CV PDFs to `data/cvs/`, one portrait per candidate, and
a `data/manifest.json` ground truth. Nothing reads them yet. Per `docs/architecture.md` §2, `rag`
owns ingestion and retrieval only — it returns retrieved chunks, never answers — and `agent` will
later import exactly one function from it.

`docs/architecture.md` §4 left five RAG questions open (extraction library, chunking strategy,
embedding provider, vector store, retrieval strategy, chunk shape). This change closes all of
them. The measurements below were taken against the actual generated dataset, not assumed.

Constraints inherited from the repo: Node + TypeScript ESM, pnpm with exact pinned versions, TDD
per `docs/tdd.md`, directory-per-concern layout per `docs/code-conventions.md`, external APIs
isolated behind a thin wrapper, and "runs locally with `pnpm install` + a `.env`" as the only
deployment target.

## Goals / Non-Goals

**Goals:**

- Turn `data/cvs/*.pdf` into a queryable index with one repeatable command.
- Expose a single narrow retrieval function carrying enough metadata for `agent` to cite sources.
- Keep the Upstash SDK behind one file, so swapping the store touches one module-internal seam.
- Prove retrieval actually works against `manifest.json` ground truth, without inventing an eval
  framework.

**Non-Goals:**

- Any LLM call. `rag` embeds and searches; `agent` owns prompting and answers.
- Chunking, re-ranking, hybrid/keyword search, metadata filtering at query time.
- Incremental/partial re-indexing, index versioning, or concurrent-run safety.
- Reading `data/content/*.json` at runtime (see Decision 3).

## Decisions

### Decision 1 — Vector store: Upstash Vector with OpenAI-hosted embeddings

Use `@upstash/vector` (pin `1.2.3`) against an index created with a hosted embedding model, so
`upsert` takes `data: string` and `query` takes `data: string` — the service embeds both sides, and
`rag` never computes or stores a float array itself.

*Correction during implementation (task 1.3):* the design originally assumed Upstash's console
still offered its own natively-hosted, free embedding models (e.g. `bge-m3`) — the same assumption
`docs/architecture.md` §4 had floated. It doesn't. At index-creation time the console only offers
two choices under "Embedding Model": **`Custom`** (bring-your-own vectors — no server-side
embedding at all) and **`openai/text-embedding-3-small`** (Upstash calls OpenAI on the caller's
behalf). This decision is rewritten against that reality.

*Alternatives considered:*

- **In-memory array + cosine similarity**, which `docs/architecture.md` §4 floated as "likely
  sufficient for ~30 documents". Rejected: it only looks cheaper. It still needs an embedding
  provider (another API surface and another failure mode), plus our own similarity code, our own
  persistence format, and a re-embed on every process start. Upstash collapses storage + search
  into one dependency even with the embedding step now depending on OpenAI.
- **Gemini embeddings + a local store.** Rejected for the same reason, and it would make `rag`
  depend on the same provider `feed` uses for an unrelated purpose, coupling two modules to one
  key for no benefit.
- **pgvector / Chroma / Qdrant.** Rejected: all require running a server or container, breaking
  the "`pnpm install` + `.env`" constraint.
- **`Custom` (bring-your-own vectors).** Rejected: it would put `rag` right back to calling an
  embedding API and computing vectors itself — exactly what this decision exists to avoid. It
  would also reopen the "which embedding provider" question this decision is meant to close.

*Chosen:* `openai/text-embedding-3-small`. Upstash performs the embedding call, but requires the
caller to supply an OpenAI API key alongside the request rather than storing one server-side per
index — so `rag` now holds **three** runtime secrets instead of two: `UPSTASH_VECTOR_REST_URL`,
`UPSTASH_VECTOR_REST_TOKEN`, and `OPENAI_API_KEY`. `OPENAI_API_KEY` lives in `rag`'s own `.env`
entry (not `feed`'s `GEMINI_API_KEY`), since it authenticates a different provider for a different
purpose.

*Trade-off accepted:* the embedding step is no longer free or invisible to this repo — it's a
metered OpenAI call (negligible cost for 25 short CVs, but real, and requires an OpenAI account
with billing enabled) gated behind a credential we manage. This is a step back from the original
"embedding model chosen once in the console, no cost, no extra key" framing, but still avoids
running embedding/similarity code ourselves, which was the actual goal.

### Decision 2 — One vector per CV, no chunking

Index each candidate as a single document whose text is the whole extracted PDF.

This was the plan's biggest open assumption, so it was measured rather than asserted. Extracting
all 25 PDFs with `unpdf` gives:

| Metric | Value |
| --- | --- |
| Shortest CV | 138 words (`floy-keebler.pdf`) |
| Longest CV | 392 words (`yesenia-homenick.pdf`) |
| Average | 258 words |
| Pages | 1, for all 25 |

Every CV sits inside the 200-500 word band where document-level embedding is the standard choice,
and the longest is still ~20% below the top of it. Chunking a 392-word document would produce
fragments that lose the candidate's name and role — the two facts every answer needs — forcing
metadata gymnastics to put them back.

*Alternatives considered:*

- **Structure-aware chunking** (one vector per section: profile / experience / education /
  skills), suggested in `docs/architecture.md` §4. Rejected for this dataset size: it multiplies
  25 vectors into ~100, makes `topK` mean "sections" instead of "candidates", and requires the
  retrieval layer to de-duplicate by candidate before `agent` can count people. The clean CV
  structure that makes it *possible* doesn't make it *useful* at 258 words per document.
- **Fixed-size windows with overlap.** Rejected: same downsides, plus arbitrary cut points.

*Revisit trigger, recorded so this isn't a silent assumption:* if a future dataset pushes any
extracted CV meaningfully past ~500 words, re-open this decision. The extraction layer is
deliberately a separate seam from the indexing layer so chunking can be inserted between them.

### Decision 3 — Ingest from the PDFs, never from `data/content/*.json`

`data/content/*.json` is `feed`'s internal generation intermediate. A real CV corpus would only
ever hand us PDFs, so reading the JSON would make the pipeline work by cheating and hide any
extraction bug. `manifest.json` is used for two narrow things only: enumerating
`candidateId` → `pdfPath` pairs during ingestion, and supplying ground truth to the integration
test. It never reaches an answer, preserving `docs/architecture.md`'s "manifest is a
test/validation aid, not a runtime dependency".

*Alternative considered:* embedding the structured JSON directly — cleaner text, no extraction
step. Rejected as above; it would invalidate the whole retrieval demonstration.

*Consequence:* `rag` must not import `@feed/output/paths` for the manifest location — that would
reach into a sibling module's internals, which `docs/architecture.md` §2 forbids. `rag` declares
its own `data/` paths, and treats the manifest's on-disk shape as the contract between the two
modules, same as the PDFs themselves.

### Decision 4 — PDF extraction: `unpdf`

Pin `unpdf@1.8.1`. Verified end-to-end against all 25 real PDFs while writing this design.

*Alternatives considered:*

- **`pdf-parse`.** Rejected: CommonJS-first, and its main entry famously runs a debug harness that
  reads a test file when imported outside its own package — awkward in an ESM-only repo.
- **`pdfjs-dist`.** Rejected: it's what `unpdf` wraps. Using it directly means hand-rolling the
  serverless build selection, worker setup, and the page-by-page `getTextContent()` loop that
  `unpdf` already packages behind one call.
- **Reusing Puppeteer** (already a `feed` dependency), rendering the PDF and scraping text.
  Rejected: launching Chromium per document to read text it can't cleanly give back is absurd
  next to a 1-call library, and it would couple `rag` to `feed`'s heaviest dependency.

*Flag:* new dependencies — `AGENTS.md` §3 "Tech Stack" gains a `rag` line for `@upstash/vector`
and `unpdf`, and §2 "Getting Started" gains `UPSTASH_VECTOR_REST_URL` /
`UPSTASH_VECTOR_REST_TOKEN` next to `GEMINI_API_KEY`.

### Decision 5 — Normalize extracted text before indexing

Extraction surfaces a real artifact of `feed`'s own templates: both `classic.ts` and `modern.ts`
apply `letter-spacing` to section headings, and the PDF text layer faithfully reproduces it, so
`PROFILE` comes out as `P R O F I L E` and `PROFESSIONAL EXPERIENCE` as
`P R O F E S S I O N A L   E X P E R I E N C E`. Ingestion therefore runs a normalization step
that re-joins runs of single letters separated by single spaces and collapses whitespace, before
the text is upserted or word-counted.

*Alternatives considered:*

- **Do nothing.** The mangled tokens are only headings, so retrieval would probably still work.
  Rejected anyway: it pollutes the embedded text and, worse, the `content` field `agent` will feed
  to an LLM as quoted context — garbled headings in a cited source look like a bug to the user.
- **Remove `letter-spacing` from `feed`'s templates.** Rejected: it degrades the PDFs' visual
  design to work around a downstream text-layer quirk, and it would force a `feed` spec change and
  a full dataset regeneration. `rag` owning its input cleanup is the smaller, more honest fix.

### Decision 6 — Retrieval returns a flat, candidate-shaped result

`retrieve(query, { topK })` → `{ candidateId, source, content, score }[]`, ordered by descending
score. `source` is the PDF path, so `agent` can cite a file the user could actually open;
`candidateId` is the join key back to the manifest; `content` is the normalized CV text that
grounds the answer; `score` lets `agent` apply its own threshold later without `rag` guessing one.

`topK` defaults to a small number and is the only knob. No filtering by metadata, no score cutoff
inside `rag` — both are policy, and policy belongs to the caller.

*Alternative considered:* returning the raw Upstash response type. Rejected: it would leak the
vendor's shape through the module boundary, so swapping the store would become a breaking change
for `agent` rather than an internal edit.

### Decision 7 — Idempotency via reset-and-rebuild, with per-candidate isolation

Ingestion resets the index, then upserts all candidates. With 25 documents the whole rebuild takes
seconds, so a full wipe is simpler and more predictable than diffing. Each candidate is processed
in its own `try`/`catch`, so one unreadable PDF doesn't abort the run; failures are collected,
reported, and the process exits non-zero if any occurred — the same failure posture `feed` already
uses.

*Alternative considered:* upsert-only, relying on `candidateId` as a stable primary key. Rejected:
it silently leaves orphaned vectors behind when a candidate is removed or renamed, and "the index
is exactly what's on disk" is a property worth having while the dataset is still churning.

### Decision 8 — Module layout: directory-per-concern

`docs/code-conventions.md` forbids loose files under `src/<module>/`, so the plan's flat sketch is
restructured:

```
src/rag/
  index.ts                            # entrypoint for `pnpm ingest:cvs` — the only root file
  env/upstash-credentials.ts          # mirrors feed/env/gemini-api-key.ts: fail fast, named vars
  dataset/paths.ts                    # rag's own data/ paths + manifest entry reading
  extraction/pdf-text.ts              # extractText({ pdfPath }) -> string
  extraction/normalize-text.ts        # the Decision 5 cleanup
  store/vector-index.ts               # the only file importing @upstash/vector
  ingestion/ingest.ts                 # reset + per-candidate upsert, returns a result summary
  retrieval/retrieve.ts               # the public interface agent imports
  retrieval/types.ts                  # RetrievedResult
```

Each with a colocated `*.test.ts`. Intra-module imports stay relative (as in `feed`); anything
crossing into `data/` uses the `@data/*` alias.

*Alternative considered:* the plan's flat `src/rag/*.ts`. Rejected — it contradicts a mandatory
convention, and `extraction/` in particular is the directory most likely to gain a second file
(the chunker, if Decision 2's revisit trigger ever fires).

### Decision 9 — Verification: one gated integration test, not an eval harness

A Vitest integration test reads `manifest.json`, picks skills that belong to exactly one
candidate, queries for them, and asserts that candidate appears in the top-K. It skips itself when
the Upstash env vars are absent, so `pnpm test` and CI stay green without credentials — the same
posture `feed` takes for its API-dependent tests.

*Alternative considered:* an eval framework (Braintrust/autoevals, as in the reference repo).
Rejected as premature: those scorers grade *answers* for groundedness and structure, and there are
no answers until `agent` exists. Revisit then.

## Risks / Trade-offs

- **CI can't exercise ingestion or retrieval end-to-end (no Upstash credentials as secrets).** →
  Unit tests cover extraction, normalization, the env contract, the manifest reading, and the
  ingestion loop's error isolation with the store mocked; only the live round-trip is gated. The
  gate is an explicit skip, so a local run with credentials reports it as run, not as absent.
- **Hosted embeddings are a black box** — model quality and dimensions are set outside the repo,
  and a model change on Upstash's side would silently alter ranking. → The index is disposable and
  rebuilt by one command, so recovery is `pnpm ingest:cvs`. Decision 1's trade-off is documented in
  `AGENTS.md` so the next reader doesn't hunt for embedding code that doesn't exist.
- **A third external dependency and a real (if tiny) per-call cost**, introduced by Decision 1's
  correction: ingestion and every query now depend on OpenAI's availability and billing, not just
  Upstash's. → Scoped to 25 documents and a handful of queries, cost stays negligible; if OpenAI
  becomes unavailable or the key is missing, `requireUpstashCredentials`-style env validation fails
  fast with a named error rather than a confusing Upstash-side failure.
- **Free-tier limits** (request rate, vector count). → 25 vectors and a handful of queries per
  session is far inside the tier; the risk only appears if the dataset grows an order of magnitude.
- **Multilingual corpus.** The CVs are deliberately mixed-language (Spanish, Catalan, English —
  visible in the manifest's skill lists), so an English-only embedding model would retrieve poorly
  across languages. → Choose a multilingual-capable Upstash embedding model at index creation, and
  make the integration test assert a cross-language hit, so a wrong model choice fails loudly
  instead of degrading quietly.
- **Normalization is heuristic** (Decision 5): re-joining single letters could in principle damage
  legitimate single-letter sequences. → It's driven by unit tests over the real headings, and is
  scoped to runs of 3+ single letters, which no real CV content produces.

## Migration Plan

Additive only — no existing behavior changes, nothing to roll back in code. Setup steps: create an
Upstash Vector index with the `openai/text-embedding-3-small` embedding model, create an OpenAI API
key, put all three vars (`UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, `OPENAI_API_KEY`)
in `.env`, run `pnpm ingest:cvs`. Rollback is deleting the index; `feed`, the dataset, and
`pnpm test` are unaffected either way.

## Open Questions

- ~~Which specific Upstash embedding model to select at index creation~~ — resolved during task
  1.3: only `Custom` and `openai/text-embedding-3-small` are offered; see Decision 1's correction.
  Its multilingual quality (Spanish/Catalan/English) isn't guaranteed the way a model explicitly
  marketed as multilingual would be — Decision 9's cross-language integration test is the guardrail
  that catches a bad fit here.
- Default `topK` value. Starting at 5 and tuning against the integration test; `agent` may want a
  different default once it exists, which is why it's a caller-supplied option rather than a
  constant baked into retrieval.
