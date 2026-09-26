# Spec: feed-cv-generation

## Purpose

End-to-end generation of the fake CV dataset used as input to the RAG pipeline (module:
**feed**): controlled candidate diversity, LLM-generated narrative content validated against a
schema, AI-generated photos, PDF rendering from HTML templates, a ground-truth manifest, caching
for idempotent re-runs, rate-limited LLM access, and provider isolation — unit-tested per
`docs/tdd.md`.

## Requirements

### Requirement: CV dataset generation

The system SHALL provide a `pnpm generate:cvs` command that generates a dataset of exactly 25
unique, fake CVs in PDF format into `data/cvs/`, with one AI-generated portrait photo per CV in
`data/photos/`.

#### Scenario: Full pipeline run

- **WHEN** the user runs `pnpm generate:cvs` with a valid `GEMINI_API_KEY`
- **THEN** `data/cvs/` contains exactly 25 unique PDF files and `data/photos/` contains one photo
  per generated CV

#### Scenario: Missing API key

- **WHEN** the user runs `pnpm generate:cvs` without `GEMINI_API_KEY` set
- **THEN** the command fails fast with a clear error message naming the missing variable, before
  making any API call

### Requirement: Controlled candidate diversity

The system SHALL generate candidates whose role, sector, language, seniority, and years of
experience vary deliberately across predefined lists, so the dataset can answer diversity-dependent
questions (e.g. "who has Python experience?") during later RAG validation.

#### Scenario: Diverse dataset

- **WHEN** the candidate set is generated
- **THEN** it spans at least 3 distinct roles, at least 2 languages, and a mix of seniority
  levels drawn from the predefined lists

#### Scenario: Reproducible metadata

- **WHEN** candidate generation runs twice with the same seed
- **THEN** both runs produce the same candidate metadata (names, contact details, roles, dates)

### Requirement: LLM-generated narrative content with schema validation

The system SHALL generate each CV's narrative content (summary, work experience, education,
skills) via the LLM as structured output, and MUST validate every response against the CV's Zod
schema, retrying on parse or validation failure.

#### Scenario: Valid structured response

- **WHEN** the LLM returns content for a candidate
- **THEN** the content is parsed and validated against the Zod schema before being used, and the
  result contains summary, experience, education, and skills sections

#### Scenario: Invalid response triggers retry

- **WHEN** the LLM returns content that fails schema validation
- **THEN** the system retries the generation for that candidate instead of writing invalid data

### Requirement: AI-generated photos

The system SHALL generate a realistic portrait photo per candidate via the LLM provider's image
generation, varying apparent age, gender, and ethnicity across candidates, and SHALL save each
photo to `data/photos/{candidateId}.png`.

#### Scenario: Photo per candidate

- **WHEN** photo generation runs for a candidate
- **THEN** a PNG portrait exists at `data/photos/{candidateId}.png` and is referenced by that
  candidate's CV

### Requirement: PDF rendering from HTML templates

The system SHALL render each CV as a PDF from an HTML/CSS template with the CV content and the
candidate's photo embedded, using Puppeteer, and SHALL name each file
`data/cvs/{first-last-name}.pdf`.

#### Scenario: Rendered PDF matches content

- **WHEN** a CV is rendered
- **THEN** the resulting PDF contains the candidate's name, contact details, summary, experience,
  education, skills, and embedded photo, and is written to `data/cvs/{first-last-name}.pdf`

### Requirement: Ground-truth manifest

The system SHALL write `data/manifest.json` capturing, for every generated CV, the ground truth:
`candidateId`, name, role, skills, and the PDF path — so the RAG pipeline's retrieval and answers
can be validated against known facts.

#### Scenario: Manifest reflects generated CVs

- **WHEN** the pipeline completes
- **THEN** `data/manifest.json` contains exactly one entry per generated PDF, and each entry's
  role and skills match the content rendered into that CV's PDF

### Requirement: Idempotent re-runs via caching

The system SHALL skip LLM calls for candidates whose generated content or photo already exists
from a previous run, so re-running the pipeline does not regenerate completed work.

#### Scenario: Cached content is reused

- **WHEN** the pipeline is re-run after a partial or complete previous run
- **THEN** candidates with existing generated content or photos are not sent to the LLM again

### Requirement: Rate-limited LLM access

The system SHALL limit concurrency of LLM API calls (via `p-limit`) to respect the provider's
free-tier rate limits.

#### Scenario: Bounded concurrency

- **WHEN** content or photos are generated for multiple candidates
- **THEN** no more than the configured number of API calls run concurrently

### Requirement: LLM provider isolation

All LLM API access (text and image) MUST go through a thin client wrapper
(`src/feed/client/gemini-client.ts`) that contains no CV domain logic, so the provider can be
swapped without changing generation logic.

#### Scenario: Provider swap is localized

- **WHEN** the LLM provider is replaced
- **THEN** only code under `src/feed/client/` changes; files under `src/feed/generators/`,
  `src/feed/templates/`, and `src/feed/render/` are unaffected

### Requirement: Unit test coverage for every module method

Every public method defined in the module SHALL be covered by unit tests written before its
implementation (red-green cycle per `docs/tdd.md`): candidate generation, `generateContent`,
`generatePhoto`, the Gemini client's text and image methods, template filling, PDF rendering, and
the pipeline orchestrator. The suite MUST run hermetically: no real LLM API calls and no writes
outside temporary or mocked paths.

#### Scenario: Unit suite covers all public methods

- **WHEN** `pnpm test` runs
- **THEN** every public method of `src/feed/` has at least one unit test and the whole suite
  passes

#### Scenario: Unit tests are hermetic

- **WHEN** the unit test suite runs
- **THEN** no request reaches the Gemini API (the client boundary is mocked) and no file is
  written outside temporary or mocked paths
