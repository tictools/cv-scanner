# Tasks: add-rag-retrieval

Every task touching `src/` is sequenced red → green per `docs/tdd.md`: write the failing test
first, then the minimum code that passes it. Layout follows design.md Decision 8.

## 1. Setup (module: rag — config only, no TDD)

- [x] 1.1 Add exact-pinned dependencies: `@upstash/vector@1.2.3` and `unpdf@1.8.1` (`pnpm add`
      honours `save-exact=true`; verify no `^`/`~` landed in `package.json`).
- [x] 1.2 Add the `ingest:cvs` script to `package.json` (`tsx src/rag/index.ts`), mirroring how
      `generate:cvs` runs `feed`.
- [x] 1.3 Create an Upstash Vector index. The console only offers `Custom` (bring-your-own vectors)
      or `openai/text-embedding-3-small` as embedding models (design.md Decision 1's correction —
      no native multilingual hosted model is available); chose `openai/text-embedding-3-small`,
      pasting an OpenAI API key (billing-enabled OpenAI account) into the console at index-creation
      time. Verified during task 5 (raw REST probe) that this key is stored server-side on the
      index, not sent per request — see design.md Decision 1's second correction.
      `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN` are `rag`'s runtime credentials in
      `.env`; `OPENAI_API_KEY` is also kept there for reference (needed only if the index is ever
      recreated), but is not read by any `rag` code.

## 2. Environment contract (module: rag)

- [x] 2.1 Red: `env/upstash-credentials.test.ts` — asserts a missing variable and a
      whitespace-only variable each throw an error naming that variable, for both vars
      (`UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`).
- [x] 2.2 Green: `env/upstash-credentials.ts` — `requireUpstashCredentials(env)` returning
      `{ url, token }`, mirroring `feed/env/gemini-api-key.ts`.
      *Reworked after task 5's discovery (design.md Decision 1's second correction):* dropped
      `OPENAI_API_KEY` from the credentials contract — matches the ratified
      `specs/rag-ingestion/spec.md` "Vector store credentials contract" requirement, which only
      ever named the two Upstash vars.

## 3. Dataset paths and manifest reading (module: rag)

- [x] 3.1 Red: `dataset/paths.test.ts` — asserts `rag` resolves its own `data/` and
      `data/manifest.json` locations, and that reading the manifest yields
      `{ candidateId, pdfPath }` entries.
- [x] 3.2 Green: `dataset/paths.ts` — `rag`'s own path constants plus the manifest reader. Must
      not import from `@feed/*` (design.md Decision 3).

## 4. Extraction and normalization (module: rag)

- [x] 4.1 Red: `extraction/normalize-text.test.ts` — `P R O F I L E` →`PROFILE`,
      `P R O F E S S I O N A L   E X P E R I E N C E` → `PROFESSIONAL EXPERIENCE`, whitespace runs
      collapsed, and ordinary prose / initials left unchanged.
- [x] 4.2 Green: `extraction/normalize-text.ts` — scoped to runs of 3+ single letters, per
      design.md Decision 5.
- [x] 4.3 Red: `extraction/pdf-text.test.ts` — extracting a fixture PDF returns its text; a
      missing or invalid path throws an error naming the path.
- [x] 4.4 Green: `extraction/pdf-text.ts` — `extractText({ pdfPath })` over `unpdf`.
- [x] 4.5 Confirm design.md Decision 2 against the implementation: assert every CV in `data/cvs/`
      normalizes to under 500 words (measured range at design time: 138-392, avg 258). If any CV
      exceeds it, stop and re-open the no-chunking decision before continuing.
      Verified via `extraction/cv-word-budget.test.ts` (gated on `data/cvs/` existing): all 25
      real CVs pass.

## 5. Vector store wrapper (module: rag)

- [x] 5.1 Red: `store/vector-index.test.ts` — asserts the wrapper builds the index from the
      credentials contract (`url`, `token`) and exposes only `reset`, `upsert` and `query`.
- [x] 5.2 Green: `store/vector-index.ts` — the only file importing `@upstash/vector`; text goes in
      as `data`, Upstash owns the embedding call end-to-end (the OpenAI key is stored server-side
      on the index per design.md Decision 1's second correction — `rag` never sends one).

## 6. Ingestion and retrieval (module: rag)

- [x] 6.1 Red: `ingestion/ingest.test.ts` with the store mocked — resets before upserting; upserts
      one vector per manifest entry keyed by `candidateId` with `{ source, candidateId, content }`
      metadata; one failing candidate doesn't abort the others and is reported.
- [x] 6.2 Green: `ingestion/ingest.ts` — returns a summary of indexed and failed candidates.
- [x] 6.3 Green: `src/rag/index.ts` — the `ingest:cvs` entrypoint: load `dotenv`, require
      credentials, run ingestion, log the count, exit non-zero if any candidate failed.
- [x] 6.4 Red: `retrieval/retrieve.test.ts` with the store mocked — maps store hits to
      `{ candidateId, source, content, score }` sorted by descending score, honours `topK`, returns
      `[]` on an empty index, and applies no score threshold.
- [x] 6.5 Green: `retrieval/types.ts` + `retrieval/retrieve.ts` — the narrow interface `agent` will
      import; no vendor types in the signature.

## 7. Verification and documentation

- [x] 7.1 Run `pnpm ingest:cvs` against the full 25-CV dataset; confirm 25 vectors indexed and a
      zero exit code. Confirmed 25/25 via the store's `/info` endpoint too.
- [x] 7.2 Red/green: the gated manifest-ground-truth integration test — a skill unique to one
      candidate retrieves that candidate in the top-K, plus a cross-language query; skips itself
      when the Upstash variables are absent.
      `retrieval/ground-truth.test.ts`: `"FastAPI"` → `nikita-crist` (same-language); `"time series
      analysis"` (English) → `floy-keebler` (whose CV lists `"Anàlisi de Sèries Temporals"` in
      Catalan) for the cross-language case. Verified both the live-pass and the
      credentials-absent-skip paths manually.
- [x] 7.3 Update `docs/architecture.md` §4: move the RAG open questions (extraction library,
      chunking, embeddings/vector store, retrieval strategy, chunk shape) to decided, pointing at
      this change's design.md. Also updated §2's `rag` bullet (was still "not designed yet").
- [x] 7.4 Update `AGENTS.md` §2 (the two `UPSTASH_VECTOR_*` runtime variables; `OPENAI_API_KEY`
      documented as a one-time console-setup credential, not read by `rag`'s code; the index's
      embedding model from task 1.3 — `openai/text-embedding-3-small` — the `ingest:cvs` script),
      §3 (`rag` dependencies), §1 (module status), and add the `rag` row to the §4 Documentation
      Map.
- [x] 7.5 Write `context/rag.md` — the as-built reference for the module, matching `context/feed.md`
      (Mermaid data flow, file-by-file walkthrough).
- [x] 7.6 Final: verify `AGENTS.md`/`docs/` still match reality, and run `pnpm lint` and
      `pnpm test`. Also ran `pnpm exec tsc --noEmit` (not part of `pnpm lint`) and fixed one
      generic-constraint type error in `store/vector-index.ts`'s `upsert` call. `pnpm lint` and
      `pnpm test` (95/95, including both gated live tests) pass clean.
