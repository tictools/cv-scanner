# Spec: rag-ingestion

Delta for change `add-agent` (module: **rag**). One existing requirement changes: the indexed vector's
metadata gains the candidate's display name, so `agent` can attribute a citation to a person without
reading `data/manifest.json` at runtime — see design.md Decision 7.

## MODIFIED Requirements

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
