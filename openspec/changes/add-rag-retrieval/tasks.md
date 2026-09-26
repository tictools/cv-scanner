# Tasks: add-rag-retrieval

Every task touching `src/` is sequenced red → green per `docs/tdd.md`: write the failing test
first, then the minimum code that passes it. Layout follows design.md Decision 8.

## 1. Setup (module: rag — config only, no TDD)

- [ ] 1.1 Add exact-pinned dependencies: `@upstash/vector@1.2.3` and `unpdf@1.8.1` (`pnpm add`
      honours `save-exact=true`; verify no `^`/`~` landed in `package.json`).
- [ ] 1.2 Add the `ingest:cvs` script to `package.json` (`tsx src/rag/index.ts`), mirroring how
      `generate:cvs` runs `feed`.
- [ ] 1.3 Create an Upstash Vector index with a **multilingual** embedding model (design.md risk:
      the corpus mixes Spanish, Catalan and English); record the chosen model name so task 7.1 can
      document it, and put `UPSTASH_VECTOR_REST_URL` / `UPSTASH_VECTOR_REST_TOKEN` in `.env`.

## 2. Environment contract (module: rag)

- [ ] 2.1 Red: `env/upstash-credentials.test.ts` — asserts a missing variable and a
      whitespace-only variable each throw an error naming that variable.
- [ ] 2.2 Green: `env/upstash-credentials.ts` — `requireUpstashCredentials(env)` returning
      `{ url, token }`, mirroring `feed/env/gemini-api-key.ts`.

## 3. Dataset paths and manifest reading (module: rag)

- [ ] 3.1 Red: `dataset/paths.test.ts` — asserts `rag` resolves its own `data/` and
      `data/manifest.json` locations, and that reading the manifest yields
      `{ candidateId, pdfPath }` entries.
- [ ] 3.2 Green: `dataset/paths.ts` — `rag`'s own path constants plus the manifest reader. Must
      not import from `@feed/*` (design.md Decision 3).

## 4. Extraction and normalization (module: rag)

- [ ] 4.1 Red: `extraction/normalize-text.test.ts` — `P R O F I L E` →`PROFILE`,
      `P R O F E S S I O N A L   E X P E R I E N C E` → `PROFESSIONAL EXPERIENCE`, whitespace runs
      collapsed, and ordinary prose / initials left unchanged.
- [ ] 4.2 Green: `extraction/normalize-text.ts` — scoped to runs of 3+ single letters, per
      design.md Decision 5.
- [ ] 4.3 Red: `extraction/pdf-text.test.ts` — extracting a fixture PDF returns its text; a
      missing or invalid path throws an error naming the path.
- [ ] 4.4 Green: `extraction/pdf-text.ts` — `extractText({ pdfPath })` over `unpdf`.
- [ ] 4.5 Confirm design.md Decision 2 against the implementation: assert every CV in `data/cvs/`
      normalizes to under 500 words (measured range at design time: 138-392, avg 258). If any CV
      exceeds it, stop and re-open the no-chunking decision before continuing.

## 5. Vector store wrapper (module: rag)

- [ ] 5.1 Red: `store/vector-index.test.ts` — asserts the wrapper builds the index from the
      credentials contract and exposes only `reset`, `upsert` and `query`.
- [ ] 5.2 Green: `store/vector-index.ts` — the only file importing `@upstash/vector`; text goes in
      as `data`, the store owns embedding (design.md Decision 1).

## 6. Ingestion and retrieval (module: rag)

- [ ] 6.1 Red: `ingestion/ingest.test.ts` with the store mocked — resets before upserting; upserts
      one vector per manifest entry keyed by `candidateId` with `{ source, candidateId, content }`
      metadata; one failing candidate doesn't abort the others and is reported.
- [ ] 6.2 Green: `ingestion/ingest.ts` — returns a summary of indexed and failed candidates.
- [ ] 6.3 Green: `src/rag/index.ts` — the `ingest:cvs` entrypoint: load `dotenv`, require
      credentials, run ingestion, log the count, exit non-zero if any candidate failed.
- [ ] 6.4 Red: `retrieval/retrieve.test.ts` with the store mocked — maps store hits to
      `{ candidateId, source, content, score }` sorted by descending score, honours `topK`, returns
      `[]` on an empty index, and applies no score threshold.
- [ ] 6.5 Green: `retrieval/types.ts` + `retrieval/retrieve.ts` — the narrow interface `agent` will
      import; no vendor types in the signature.

## 7. Verification and documentation

- [ ] 7.1 Run `pnpm ingest:cvs` against the full 25-CV dataset; confirm 25 vectors indexed and a
      zero exit code.
- [ ] 7.2 Red/green: the gated manifest-ground-truth integration test — a skill unique to one
      candidate retrieves that candidate in the top-K, plus a cross-language query; skips itself
      when the Upstash variables are absent.
- [ ] 7.3 Update `docs/architecture.md` §4: move the RAG open questions (extraction library,
      chunking, embeddings/vector store, retrieval strategy, chunk shape) to decided, pointing at
      this change's design.md.
- [ ] 7.4 Update `AGENTS.md` §2 (the two `UPSTASH_VECTOR_*` variables, the index's embedding model
      from task 1.3, the `ingest:cvs` script), §3 (`rag` dependencies), §1 (module status), and add
      the `rag` row to the §4 Documentation Map.
- [ ] 7.5 Write `context/rag.md` — the as-built reference for the module, matching `context/feed.md`
      (Mermaid data flow, file-by-file walkthrough).
- [ ] 7.6 Final: verify `AGENTS.md`/`docs/` still match reality, and run `pnpm lint` and
      `pnpm test`.
