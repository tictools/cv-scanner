# Proposal: add-cv-generation

## Why

The chat app needs exactly 25 realistic fake CVs (PDF) as the input feed for the RAG pipeline.
Generating them ourselves also yields a ground truth (`manifest.json`) for automated validation
of retrieval and answers — impossible with a real dataset.

## What Changes

- New **`feed`** module under `src/feed/` implementing the pipeline:
  - Deterministic candidate metadata via `@faker-js/faker` + predefined lists (controlled
    diversity); narrative content via Gemini structured output validated with Zod (retry on
    failure); AI portraits via Gemini image generation.
  - PDFs rendered from HTML/CSS templates via Puppeteer (never by the LLM).
  - `manifest.json` ground truth per CV for later RAG validation.
- LLM access isolated behind a thin `client/gemini-client.ts` wrapper (no domain logic).
- Unit tests for every public method, test-first per `docs/tdd.md`, Gemini client mocked; picks
  **Vitest** as the repo's test runner (resolves that open item).
- Dependencies: `zod`, `@faker-js/faker`, `puppeteer`, `p-limit`, `@google/generative-ai`,
  `dotenv`; `vitest` + `tsx` (dev). Scripts: `generate:cvs`, `test`; `GEMINI_API_KEY` in `.env`.
- Artifacts (PDFs, photos, manifest) go to top-level `data/`, not committed as source.

## Capabilities

### New Capabilities

- `feed-cv-generation` (module: **feed**): end-to-end generation of the fake CV dataset —
  diversity, schema-validated content, photos, PDF rendering, caching, ground-truth manifest,
  unit-tested.

### Modified Capabilities

<!-- None — no existing specs. -->

## Impact

- **Code**: new `src/feed/` tree plus unit tests.
- **Data**: new `data/` output (PDFs, photos, `manifest.json`).
- **Config**: `package.json` deps + scripts; `.env`; AGENTS.md and `docs/tdd.md` updates.
- **Other modules**: none — they consume `data/` in later proposals.

## Non-goals

- RAG pipeline, answer agent, chat UI — separate proposals.
- Real CV data, multiple LLM providers, deployment, multi-user concerns.
