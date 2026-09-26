# Design: add-cv-generation

## Context

The repo is at early scaffolding: no code in `src/` yet. `docs/architecture.md` fixes the system
shape (four modules under `src/`, generated artifacts under top-level `data/`, modules coupled
through `data/` and narrow interfaces) and the LLM provider (Gemini, single key, behind a thin
client wrapper). The detailed implementation plan lives in `plans/cv-generation-plan.md`
(gitignored scratch); this design promotes its decisions into a versioned spec. One discrepancy
between them is resolved below (output directory name). The change is also the first to apply the
repo-wide import path alias convention (`@feed/*`, `@rag/*`, `@agent/*`, `@app/*`, `@data/*`)
recorded in `docs/architecture.md` §3.

## Goals / Non-Goals

**Goals:**

- Generate exactly 25 unique, realistic fake CVs (PDF + AI photo) into `data/` via
  `pnpm generate:cvs`.
- Produce `data/manifest.json` as ground truth for later RAG validation.
- Keep provider-specific code isolated so Gemini can be swapped without touching domain logic.
- Make re-runs cheap and idempotent (caching, rate-limited API access).

**Non-Goals:**

- The `rag`, `agent`, and `app` modules (separate proposals).
- Real CV data, multiple LLM providers, deployment, multi-user support.

## Decisions

### 1. Single LLM provider (Gemini) for both text and image generation

One API key, one SDK, one client wrapper — minimal integration friction on the free tier.

- **Alternative**: separate providers for text and image (e.g. Gemini for text, a dedicated image
  model). Rejected: doubles auth/client/rate-limit surface for no quality requirement that
  justifies it in a fake dataset.

### 2. Hybrid deterministic + generative generation

Mechanical metadata (names, emails, phones, dates, role/sector/language/seniority) is generated
deterministically with `@faker-js/faker` plus predefined lists; only narrative content (summary,
experience, education, skills) comes from the LLM.

- **Alternative**: fully LLM-generated candidates. Rejected: less control over dataset diversity
  (needed to validate questions like "who has Python experience?"), higher token cost, and no
  reproducibility.
- **Alternative**: fully faker-generated content. Rejected: produces obviously templated,
  unrealistic CV text, undermining the "realistic-looking" requirement.

### 3. Structured LLM output validated with Zod

The LLM returns JSON structured output per a Zod schema mirroring the `Cv` type; parse/validation
failures trigger a retry rather than writing bad data.

- **Alternative**: free-text generation + post-hoc parsing. Rejected: brittle; schema-validated
  structured output guarantees the template always receives a complete, well-typed `Cv`.

### 4. PDF rendering via HTML/CSS templates + Puppeteer

The LLM never touches layout: each `Cv` fills an HTML/CSS template, rendered to PDF with
Puppeteer's `page.pdf()`. Two templates (`modern`, `classic`) provide visual variety.

- **Alternative**: programmatic PDF construction (PDFKit, pdf-lib). Rejected: far more effort for
  realistic layout/typography than HTML/CSS, which the team already knows.
- **Alternative**: LaTeX. Rejected: heavy toolchain dependency for a local demo project.

### 5. Output directory is `data/`, not `output/`

`plans/cv-generation-plan.md` left the name open (`output/` ⚠); `docs/architecture.md` (canonical)
already decided `./data/` — `rag` will read from `data/`, so `feed` writes there:
`data/cvs/*.pdf`, `data/photos/*.png`, `data/manifest.json`.

- **Alternative**: `output/` as sketched in the plan. Rejected: contradicts the canonical
  architecture doc, which is the reference the `rag` module will be designed against.

### 6. Files grouped by nature, not by pipeline step

`generators/` (domain logic), `client/` (external API access), `templates/` (presentation),
`render/` (PDF transformation). The client wrapper holds no CV domain knowledge.

- **Alternative**: group by pipeline step (`candidates/`, `content/`, `photos/`, `pdf/`).
  Rejected: mixes domain logic with I/O concerns and makes the provider boundary harder to see.

### 7. Cache-and-skip for idempotent re-runs

Generated content JSON and photos are persisted per `candidateId`; re-runs reuse them instead of
calling the LLM again.

- **Alternative**: always regenerate. Rejected: wastes free-tier quota and makes iteration on
  templates/rendering slow and expensive.

### 8. Concurrency limited with `p-limit`

LLM calls run with bounded concurrency sized for the Gemini free tier. Note this only bounds
in-flight calls — it does not by itself enforce the provider's requests-per-minute cap; that
protection comes from the small total volume (~50 calls), retry-on-429, and cache-and-skip
(decision 7).

- **Alternative**: sequential calls. Rejected: unnecessarily slow for 25 CVs.
- **Alternative**: unbounded parallelism. Rejected: hits free-tier rate limits.
- **Alternative**: ad-hoc batch loop (`Promise.allSettled` in chunks of N, ~8 lines, zero deps).
  Viable at this scale, but it means owning a hand-rolled scheduling primitive for a negligible
  gain over a single tiny import; the batch barrier also stalls each chunk behind its slowest
  call.
- **Alternative**: hand-rolled `createLimit` clone (~25 lines, zero deps). Same algorithm as
  `p-limit`, but we would own its edge cases (verified empirically: concurrency `0` deadlocks
  silently, `NaN` disables the limit) and its tests — more assurance burden than depending on a
  tiny, zero-dependency, battle-tested package.

### 9. New dependencies

- `zod` — schema validation of LLM structured output (decision 3).
- `@faker-js/faker` — deterministic candidate metadata (decision 2).
- `puppeteer` — HTML → PDF rendering (decision 4).
- `p-limit` — bounded LLM concurrency (decision 8).
- `@google/generative-ai` — Gemini SDK, used only inside `client/` (decision 1).
- `dotenv` — load `GEMINI_API_KEY` from `.env`.
- `vitest` (devDependency) — unit test runner (decision 10).
- `tsx` (devDependency) — runs TS ESM while resolving `tsconfig` path aliases at runtime, for the
  `generate:cvs` script; Node's built-in type stripping does not resolve `paths` (see
  `docs/architecture.md` §3).

Each runtime dependency is confined to `src/feed/`. **AGENTS.md "Tech Stack" must be updated** to
move these from "planned, not yet installed" to installed once the change lands (its CV-generation
bullet already anticipates them), and the open item in `docs/tdd.md` must record the chosen test
runner so the next module reuses it.

### 10. Test framework: Vitest, with the client as the single mocking boundary

`docs/tdd.md` mandates TDD for any behavior under `src/` and leaves the runner as an open item
for the first implemented module — that's `feed`. Vitest: first-class TypeScript + ESM support,
jest-like API, fast watch mode for the red-green loop.

- **Alternative**: `node:test` (built-in, zero deps). Rejected: needs a TS loader/transpile step
  and more mocking boilerplate — friction in every red-green cycle, for a saving of one dev
  dependency.
- **Alternative**: Jest. Rejected: heavier, and its ESM support is historically clunky; no
  advantage over Vitest for this stack.

Unit testing strategy, per the module layout: `client/gemini-client.ts` is the **single mocking
boundary** — generator tests mock the client, so the suite never touches the network (a spec
requirement). Schema validation and template filling are pure functions, tested directly.
Filesystem-touching code (cache, photos, manifest) writes to temp dirs in tests. The Puppeteer
glue in `render/` is kept deliberately thin so unit tests target HTML filling rather than a real browser.

## Risks / Trade-offs

- [Gemini free-tier rate limits abort a full run] → `p-limit` + cache-and-skip make runs
  resumable; a failed run is retried without losing completed work.
- [Image generation quality/availability varies on the free tier] → photos are cached per
  candidate, so regenerating one bad photo doesn't redo the dataset; a placeholder fallback can be
  added if the image API proves unreliable.
- [LLM content still varies run-to-run despite a seeded faker] → determinism is guaranteed only
  for metadata; the cached content JSON pins each candidate's narrative once generated.
- [Puppeteer downloads a Chromium binary (~large install)] → accepted cost; standard for
  HTML → PDF and isolated to dev-time generation, not runtime.
- [A unit test accidentally hits the real Gemini API (cost, flakiness)] → the client is the
  single mock boundary and the spec requires the suite to pass hermetically, with no network.

## Migration Plan

Not applicable — new module with no existing consumers. Rollout: `pnpm install`, add
`GEMINI_API_KEY` to `.env`, run `pnpm generate:cvs`, manually review 3-4 PDFs and the manifest.

## Open Questions

- Exact Gemini models to use for text (e.g. a flash-class model) and for image generation —
  resolve at implementation time against current AI Studio free-tier availability.
- Whether both templates are needed for the first run, or one template suffices initially.
