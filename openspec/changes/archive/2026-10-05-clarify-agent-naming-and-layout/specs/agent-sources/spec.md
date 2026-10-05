## ADDED Requirements

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
