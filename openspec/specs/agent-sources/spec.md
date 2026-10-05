# Spec: agent-sources

Agent module: derives a turn's source references (which CVs an answer was grounded in) from the
retrieval tool's results.

## Requirements

### Requirement: Sources are derived from tool results, never from the model's prose

The system SHALL build a turn's source references from the retrieval tool's results for that turn,
and MUST NOT parse citations out of the model's answer text.

#### Scenario: Sources match what was retrieved

- **WHEN** the model calls `scan-cv` and answers from its results
- **THEN** the turn's sources are exactly the candidates those results named

#### Scenario: Model mentions a candidate it did not retrieve

- **WHEN** the answer text names a candidate that appears in no tool result
- **THEN** that candidate is not listed as a source, because sources come from the results rather
  than the text

#### Scenario: No tool call means no sources

- **WHEN** the model answers without calling the retrieval tool
- **THEN** the turn carries zero sources, and this is a valid turn rather than an error

### Requirement: Source reference shape

The system SHALL return each source as `{ candidateId, candidateName, source, score }`, where
`source` is the candidate's repo-relative PDF path, and MUST NOT construct an HTTP URL — how the PDF
is served is the frontend's concern.

#### Scenario: Reference fields populated

- **WHEN** a source is returned for a retrieved candidate
- **THEN** it carries that candidate's `candidateId`, their `candidateName`, their `data/cvs/…pdf`
  path as `source`, and the retrieval `score` that put it there

#### Scenario: No origin is invented

- **WHEN** a source reference is produced
- **THEN** `source` is the repo-relative path as `rag` returned it, with no host, scheme, or route
  prefix added

### Requirement: Sources are de-duplicated and ordered by relevance

The system SHALL list each candidate at most once per turn, keeping that candidate's highest score
when several results refer to them, and SHALL order sources by descending score.

#### Scenario: Same candidate retrieved twice in one turn

- **WHEN** the model calls the retrieval tool twice and a candidate appears in both result sets
- **THEN** that candidate appears once in the sources, carrying the higher of the two scores

#### Scenario: Ordering

- **WHEN** a turn has several sources
- **THEN** they are ordered from highest to lowest score

### Requirement: Source attribution performs no I/O

The system MUST derive source references without reading the filesystem, `data/manifest.json`, or any
network resource, so attribution works inside a Workers runtime and stays a pure function of the tool
results.

#### Scenario: Attribution inside the Worker

- **WHEN** a turn's sources are assembled while running in the Workers runtime
- **THEN** no filesystem or manifest access is attempted, and the candidate's name comes from the
  retrieval result

#### Scenario: Attribution is unit-testable

- **WHEN** source extraction is tested
- **THEN** it can be driven with in-memory tool results alone, with no store, manifest, or fixture
  file

### Requirement: Source and chunk extraction is scoped to the tool that produced the results

The system SHALL derive sources and retrieved chunks only from results of the `scan-cv` tool, using a
single shared definition of that tool's name, and MUST ignore results from any other tool.

#### Scenario: Results from another tool are ignored

- **WHEN** a turn's tool results include an entry whose tool name is not `scan-cv`
- **THEN** it contributes no sources and no retrieved chunks

#### Scenario: Sources and chunks agree on which results count

- **WHEN** a turn's tool results contain `scan-cv` and non-`scan-cv` entries
- **THEN** the sources and the retrieved chunks are both derived from the same `scan-cv` entries only

#### Scenario: Malformed scan-cv output yields nothing

- **WHEN** a `scan-cv` result's output is not a list of retrieval results
- **THEN** it contributes no sources and no retrieved chunks, and the turn does not fail
