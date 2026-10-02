## MODIFIED Requirements

### Requirement: The source panel lists the cited CVs of the most recent answered turn, one per row

The system SHALL list, in a dedicated source panel, the cited CVs of the most recent assistant message
that has any and whose turn has finished streaming, one entry per row stacked vertically, and MUST
replace that list when a later turn produces its own only once that later turn has finished streaming.

The panel is scoped to the current answer rather than accumulating the whole conversation, so it always
answers "which CVs support the answer I am reading". A turn counts as answered only when its answer has
finished streaming, whether it succeeded or failed. A panel that switched as soon as retrieval resolved
would list a turn's candidates before the text that justifies them.

#### Scenario: A turn produces sources

- **WHEN** an answer with cited CVs completes
- **THEN** the source panel lists that turn's candidates, each on its own row, ordered from the
  highest score down

#### Scenario: Retrieval resolves while the answer is still streaming

- **WHEN** a turn's retrieval results have arrived but its answer is still streaming
- **THEN** the panel keeps showing the previous answered turn's candidates, or that no CVs have been
  cited yet if there is no such turn, and switches to the new turn's candidates only once the answer
  finishes streaming

#### Scenario: The turn ends in an error after retrieval resolved

- **WHEN** a turn's retrieval results have arrived and the turn then stops streaming with an error
- **THEN** the panel lists that turn's candidates, as it would for a turn that completed

#### Scenario: A later turn produces its own sources

- **WHEN** a subsequent answer cites a different set of candidates and finishes streaming
- **THEN** the panel shows the newer set and no longer shows the previous one

#### Scenario: No answer has sources yet

- **WHEN** the conversation is empty, or no answer has cited any CV
- **THEN** the panel shows that no CVs have been cited yet, rather than an empty area with no
  explanation
