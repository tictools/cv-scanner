# Spec: rag-retrieval

Delta for change `add-agent` (module: **rag**). Two existing requirements change so that `agent` can
call `retrieve` from a Workers runtime, which has no `process.env`, and can name a candidate in a
citation without reading `data/manifest.json` — see design.md Decisions 6 and 7.

## MODIFIED Requirements

### Requirement: Ranked retrieval interface

The system SHALL expose a single `retrieve(query, { topK, credentials })` function that returns at
most `topK` results ordered by descending similarity score, and this function MUST be the only
surface other modules import from `rag`. `credentials` is optional: when omitted, the vector store
credentials are read from the process environment as before; when supplied, they are used instead, so
a caller running where `process.env` does not exist can pass them explicitly.

#### Scenario: Query returns ranked candidates

- **WHEN** `retrieve` is called with a natural-language question and a `topK` of 5
- **THEN** it returns at most 5 results, ordered from highest to lowest score

#### Scenario: Empty index

- **WHEN** `retrieve` is called before any ingestion has run
- **THEN** it returns an empty list rather than raising

#### Scenario: Credentials supplied by the caller

- **WHEN** `retrieve` is called with `credentials` and the process environment holds no Upstash
  variables
- **THEN** the query is made with the supplied credentials and succeeds

#### Scenario: Credentials omitted

- **WHEN** `retrieve` is called without `credentials`
- **THEN** it reads `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN` from the process
  environment and fails fast naming the missing variable if either is absent

### Requirement: Result shape carries source metadata

The system SHALL return each result as `{ candidateId, candidateName, source, content, score }`,
where `candidateName` is the candidate's display name, `source` is the candidate's PDF path, and
`content` is the normalized CV text, so `agent` can ground an answer and cite which CV — and whose —
it came from without querying the vector store or reading `data/manifest.json` itself.

#### Scenario: Result fields populated

- **WHEN** a result is returned for an indexed candidate
- **THEN** it carries that candidate's `candidateId`, their `candidateName`, the `data/cvs/…pdf` path
  as `source`, the candidate's normalized CV text as `content`, and a numeric `score`

#### Scenario: Name comes from the index, not the manifest

- **WHEN** a consumer needs the candidate's display name for a citation
- **THEN** it reads `candidateName` from the result, and no manifest read happens at query time

#### Scenario: Vendor types do not leak

- **WHEN** another module consumes a retrieval result
- **THEN** it depends only on the shape above, never on the vector store SDK's own response type
