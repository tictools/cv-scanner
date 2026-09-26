# Tasks: add-cv-generation

Implementation derives from `design.md` (decisions 1-10) and
`specs/feed-cv-generation/spec.md`. All work is in the **feed** module unless noted.

Per `docs/tdd.md`, every task that implements behavior under `src/` is sequenced as **write the
failing test → make it pass**; pure config/tooling tasks are exempt.

## 1. Project setup (feed)

- [ ] 1.1 Add dependencies: `zod`, `@faker-js/faker`, `puppeteer`, `p-limit`,
  `@google/generative-ai`, `dotenv`; add `vitest` and `tsx` as devDependencies
- [ ] 1.2 Verify `tsconfig.json` covers `src/` for ESM + Node and declare the path aliases
  (`@feed/*`, `@rag/*`, `@agent/*`, `@app/*`, `@data/*`, per `docs/architecture.md` §3); add the
  `generate:cvs` (`tsx src/feed/index.ts`) and `test` (`vitest run`) scripts to `package.json`,
  configuring Vitest to resolve the same aliases
- [ ] 1.3 Add `data/` to `.gitignore` (generated artifacts are not source)
- [ ] 1.4 Write a failing test that the CLI fails fast naming `GEMINI_API_KEY` when unset; then
  implement `.env` loading via `dotenv` plus the check

## 2. Domain definition (feed)

- [ ] 2.1 Create `src/feed/types.ts`: `Candidate` (role, seniority, sector, language, years of
  experience) and `Cv` (name, contact, summary, experience[], education[], skills[], photoPath) —
  pure types, no tests needed
- [ ] 2.2 Write failing unit tests for `schema.ts` (accepts a valid `Cv`; rejects missing/invalid
  fields), then implement the Zod schema mirroring `Cv`

## 3. Gemini client wrapper (feed)

- [ ] 3.1 Write failing unit tests for `client/gemini-client.ts` with `@google/generative-ai`
  mocked (text call returns parsed structured output; image call returns bytes; API errors
  propagate), then implement the thin wrapper with no CV domain logic

## 4. Candidate generation — deterministic (feed)

- [ ] 4.1 Write failing unit tests for `generators/candidates.ts` (exactly 25 candidates;
  diversity: ≥3 roles, ≥2 languages, mixed seniority; same seed → identical metadata), then
  implement it from the predefined lists plus seeded `faker`

## 5. Content generation — LLM (feed)

- [ ] 5.1 Write failing unit tests for `generators/content.ts` with the client mocked (valid
  structured output → usable `Cv`; invalid response → retried, never written), then implement
  `generateContent(candidate)` against `schema.ts`
- [ ] 5.2 Add `p-limit` concurrency control sized for the Gemini free tier
- [ ] 5.3 Write failing unit tests for the cache (existing content JSON for a `candidateId` → no
  client call), then implement cache-and-skip using temp dirs in tests

## 6. Photo generation — image LLM (feed)

- [ ] 6.1 Write failing unit tests for `generators/photos.ts` with the client mocked (saves PNG to
  `data/photos/{candidateId}.png`; cached photo → no client call; prompt varies age/gender/
  ethnicity), then implement `generatePhoto(candidate)` using temp dirs in tests

## 7. Templates and PDF rendering (feed)

- [ ] 7.1 Write failing unit tests for template filling (every `Cv` field plus the photo reference
  appears in the resulting HTML), then implement the template(s) under `src/feed/templates/`
- [ ] 7.2 Write failing unit tests for `render/pdf-renderer.ts` (writes to
  `data/cvs/{first-last-name}.pdf`; Puppeteer kept as thin glue, mocked or isolated), then
  implement the renderer

## 8. Orchestration and CLI (feed)

- [ ] 8.1 Write failing unit tests for `generate.ts` with generators and renderer mocked
  (per-candidate order: candidates → content → photo → PDF; one manifest entry written per CV with
  `candidateId`, name, role, skills, PDF path), then implement the orchestrator including
  `data/manifest.json`
- [ ] 8.2 Create `src/feed/index.ts` as the `pnpm generate:cvs` entry point (wires the
  `GEMINI_API_KEY` check from 1.4 to `generate.ts`)

## 9. Verification (cross-cutting)

- [ ] 9.1 `pnpm test` is green and every public method of `src/feed/` has unit coverage, with no
  network access (spec: unit test coverage requirement)
- [ ] 9.2 Run the full pipeline and manually review 3-4 PDFs (coherent content, rendered photo,
  correct layout) against the spec scenarios
- [ ] 9.3 Check `data/manifest.json` accurately reflects each CV's content, and that a re-run
  skips cached content/photos
- [ ] 9.4 Update `docs/tdd.md` (record Vitest as the chosen runner in the open item) and AGENTS.md
  (Tech Stack: deps installed; Documentation Map), and run available checks
