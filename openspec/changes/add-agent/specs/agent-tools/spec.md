# Spec: agent-tools

Delta for change `add-agent`. All requirements below are new (module: **agent**).

## ADDED Requirements

### Requirement: CV search is offered to the model as a tool

The system SHALL expose CV retrieval to the model as a callable tool named `scan-cv`, carrying a
description and an input schema, and MUST let the model decide whether to call it — retrieval MUST
NOT be hardcoded to run on every turn.

#### Scenario: Model searches before answering a corpus question

- **WHEN** a user asks a question about candidates
- **THEN** the model calls `scan-cv` and the answer is built from its results

#### Scenario: Turn completes without searching

- **WHEN** a user sends a greeting, or a request outside the CV corpus that `agent-orchestration`
  requires to be declined
- **THEN** `scan-cv` is not called, and the turn still completes successfully with no sources —
  a tool-less turn is valid, not a failure

#### Scenario: Tool schema is derived from one definition

- **WHEN** the tool's input schema changes
- **THEN** both the schema advertised to the model and the type of the validated input change with
  it, because both derive from the same declaration

### Requirement: Tool input is validated before execution

The system MUST validate the model's tool input against the tool's schema before the tool body runs,
and MUST reject an input that does not satisfy the schema rather than passing it through to `rag`.

#### Scenario: Well-formed input

- **WHEN** the model calls `scan-cv` with a query string and a `topK` within the allowed range
- **THEN** the tool body runs with those values

#### Scenario: Out-of-range input

- **WHEN** the model calls `scan-cv` with a `topK` above the allowed maximum or a non-integer
- **THEN** the input is rejected by validation and `rag`'s retrieval function is not called

#### Scenario: Omitted optional input

- **WHEN** the model calls `scan-cv` with a query but no `topK`
- **THEN** the documented default is applied

### Requirement: Retrieval results reach the model with their source metadata

The system SHALL return each `scan-cv` result to the model with the candidate's `candidateId`,
`candidateName`, `source`, `content`, and `score`, so the model can both ground its answer and
attribute each fact to a candidate.

#### Scenario: Result fields present

- **WHEN** `scan-cv` returns results for a query
- **THEN** each result carries that candidate's `candidateId`, `candidateName`, `source` path, CV
  `content`, and `score`

#### Scenario: No match

- **WHEN** the index returns no results for a query
- **THEN** the tool returns an empty result set rather than an error, and the model reports that
  nothing was found

### Requirement: Retrieval failures are returned as data, not thrown

The system MUST convert a retrieval failure into a tool result describing the error, so the model can
tell the user that the search failed instead of the turn aborting mid-stream.

#### Scenario: Vector store unavailable

- **WHEN** `rag`'s retrieval function throws, for example because the vector store is unreachable
- **THEN** `scan-cv` returns a result carrying an error message, the stream is not broken, and the
  user is told the search failed

#### Scenario: Missing credentials surface as a tool error

- **WHEN** the Upstash credentials are absent or invalid at the time of the call
- **THEN** the failure is reported through the tool result, not as an unhandled exception

### Requirement: Tools are registered in one extensible record

The system SHALL register tools in a single record keyed by the tool name the model sees, so adding a
capability is one new tool file plus one entry, with no change to the orchestration logic.

#### Scenario: Adding a second tool

- **WHEN** a new tool is added to the record
- **THEN** it becomes available to the model without editing the orchestration functions, the
  Durable Object, or the Worker entry

#### Scenario: Tool set is shared by both entry points

- **WHEN** the tool record changes
- **THEN** both the streaming path and the non-streaming eval path expose the new tool set
