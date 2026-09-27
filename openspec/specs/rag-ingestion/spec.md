# Spec: rag-ingestion

RAG module: ingestion pipeline for CV PDF extraction and vector indexing.

## Requirements

### Requirement: One-shot ingestion command

The system SHALL provide a `pnpm ingest:cvs` command that reads every CV PDF listed in
`data/manifest.json`, extracts its text, and indexes one vector per candidate in the vector store.

#### Scenario: Full ingestion run

- **WHEN** the user runs `pnpm ingest:cvs` with valid Upstash credentials and a populated
  `data/` directory
- **THEN** the vector store holds exactly one vector per manifest entry, keyed by `candidateId`,
  and the command reports how many candidates were indexed

#### Scenario: Re-run after a dataset change

- **WHEN** `pnpm ingest:cvs` is run a second time after a candidate was removed from the dataset
- **THEN** the index is reset before upserting, so it contains exactly the current manifest's
  candidates and no vector from the previous run survives

### Requirement: Vector store credentials contract

The system MUST fail fast with a clear error naming the missing variable when
`UPSTASH_VECTOR_REST_URL` or `UPSTASH_VECTOR_REST_TOKEN` is absent or blank, before any network
call is made.

#### Scenario: Missing credentials

- **WHEN** `pnpm ingest:cvs` runs without `UPSTASH_VECTOR_REST_TOKEN` set
- **THEN** the command exits with an error message naming `UPSTASH_VECTOR_REST_TOKEN` and telling
  the user to set it in `.env`, and no request is sent to the vector store

#### Scenario: Whitespace-only value

- **WHEN** an Upstash variable is set to a whitespace-only string
- **THEN** it is treated as missing and the same fail-fast error is raised

### Requirement: PDF text extraction

The system SHALL extract the text content of a CV from its rendered PDF file, and MUST NOT read
`data/content/*.json` — the structured content is `feed`'s internal generation detail, not a
runtime input.

#### Scenario: Text extracted from a real CV PDF

- **WHEN** extraction runs on a PDF from `data/cvs/`
- **THEN** it returns the CV's text, including the candidate's name, contact line, and the body of
  their profile, experience, education, and skills sections

#### Scenario: Unreadable file

- **WHEN** extraction is given a path that is missing or is not a valid PDF
- **THEN** it raises an error identifying the offending path rather than returning empty text

### Requirement: Extracted text normalization

The system SHALL normalize extracted text before indexing it, re-joining the letter-spaced section
headings that `feed`'s PDF templates produce and collapsing runs of whitespace into single spaces.

#### Scenario: Letter-spaced heading

- **WHEN** the extracted text contains a heading rendered by the PDF text layer as
  `P R O F E S S I O N A L   E X P E R I E N C E`
- **THEN** the normalized text contains `PROFESSIONAL EXPERIENCE`

#### Scenario: Ordinary prose is left intact

- **WHEN** the extracted text contains ordinary sentences, initials, or single-letter words
- **THEN** normalization changes only whitespace, leaving the words themselves unmodified

### Requirement: Document-level indexing without chunking

The system SHALL index each candidate's full normalized CV text as a single vector, with no chunking,
and SHALL store `candidateId`, the candidate's `name`, the source PDF path, and the normalized text as
that vector's metadata so retrieval can return them. The `name` is read from `data/manifest.json`
during ingestion, where the manifest is already the enumeration input — it is never read at query
time.

#### Scenario: One vector per candidate

- **WHEN** a candidate is indexed
- **THEN** exactly one vector exists with that candidate's `candidateId` as its key, carrying their
  `name`, the source PDF path, and the full normalized CV text in its metadata

#### Scenario: Name is carried through to retrieval

- **WHEN** a query matches an indexed candidate
- **THEN** the candidate's `name` is available from the result's metadata, with no further lookup

#### Scenario: Embedding is delegated to the store

- **WHEN** a candidate's text is upserted
- **THEN** the raw text is sent to the vector store, which produces the embedding — the system never
  calls a separate embedding API nor computes vectors itself

#### Scenario: Re-ingestion after the metadata change

- **WHEN** `pnpm ingest:cvs` is re-run after this change
- **THEN** every vector is rebuilt with `name` in its metadata, because ingestion resets the index
  before upserting

### Requirement: Per-candidate failure isolation

The system MUST process each candidate independently, so a failure on one candidate does not abort
the run, and MUST exit with a non-zero status code reporting every candidate that failed.

#### Scenario: One unreadable PDF among many

- **WHEN** one candidate's PDF cannot be read but the rest succeed
- **THEN** every other candidate is still indexed, the failing `candidateId` and its reason are
  reported, and the command exits non-zero

#### Scenario: All candidates succeed

- **WHEN** every candidate is indexed without error
- **THEN** the command exits zero and reports the number of candidates indexed
