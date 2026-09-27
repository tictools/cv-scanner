# Spec: rag-retrieval

Delta for change `add-rag-retrieval`. All requirements below are new (module: **rag**).

## ADDED Requirements

### Requirement: Ranked retrieval interface

The system SHALL expose a single `retrieve(query, { topK })` function that returns at most `topK`
results ordered by descending similarity score, and this function MUST be the only surface other
modules import from `rag`.

#### Scenario: Query returns ranked candidates

- **WHEN** `retrieve` is called with a natural-language question and a `topK` of 5
- **THEN** it returns at most 5 results, ordered from highest to lowest score

#### Scenario: Empty index

- **WHEN** `retrieve` is called before any ingestion has run
- **THEN** it returns an empty list rather than raising

### Requirement: Result shape carries source metadata

The system SHALL return each result as `{ candidateId, source, content, score }`, where `source` is
the candidate's PDF path and `content` is the normalized CV text, so `agent` can ground an answer
and cite which CV it came from without querying the vector store itself.

#### Scenario: Result fields populated

- **WHEN** a result is returned for an indexed candidate
- **THEN** it carries that candidate's `candidateId`, the `data/cvs/…pdf` path as `source`, the
  candidate's normalized CV text as `content`, and a numeric `score`

#### Scenario: Vendor types do not leak

- **WHEN** another module consumes a retrieval result
- **THEN** it depends only on the shape above, never on the vector store SDK's own response type

### Requirement: Retrieval applies no answer-level policy

The system MUST NOT filter results by score threshold, rewrite the query, or consult
`data/manifest.json` at query time — retrieval returns ranked chunks and leaves relevance policy
and answer construction to `agent`.

#### Scenario: Low-scoring matches are still returned

- **WHEN** a query matches no candidate well
- **THEN** the top-scoring results are still returned with their scores, so the caller can decide
  what to do with them

#### Scenario: No ground-truth shortcut

- **WHEN** a query names a skill that `data/manifest.json` records for a candidate
- **THEN** the result is derived from the indexed PDF text only, never from the manifest

### Requirement: Ground-truth retrieval verification

The system SHALL include an integration test that uses `data/manifest.json` as ground truth to
assert that querying for a skill belonging to exactly one candidate returns that candidate within
the top-K results, and this test MUST skip itself when the Upstash credentials are absent so the
default `pnpm test` run and CI stay green without them.

#### Scenario: Known skill retrieves its candidate

- **WHEN** the index has been built and the test queries for a skill that the manifest attributes
  to exactly one candidate
- **THEN** that candidate's `candidateId` appears in the top-K results

#### Scenario: Cross-language retrieval

- **WHEN** the test queries in one language for a candidate whose CV is written in another
- **THEN** that candidate is still retrieved, confirming the index's embedding model handles the
  dataset's mixed languages

#### Scenario: Credentials absent

- **WHEN** `pnpm test` runs without the Upstash environment variables set
- **THEN** the integration test is skipped and reported as skipped, and the suite passes
