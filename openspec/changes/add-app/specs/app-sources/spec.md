# Spec: app-sources

App module: how a turn's cited CVs are derived from the agent's retrieval results, shown inline and in
the source panel, and opened as the candidate's PDF.

## ADDED Requirements

### Requirement: Cited CVs are derived from the turn's retrieval results, never from the answer text

The system SHALL derive the CVs shown for an answer from the retrieval tool results carried by that
assistant message, and MUST NOT parse, infer, or accept any citation from the answer's prose.

The derivation reuses `agent`'s own source-extraction rule rather than restating it, so the candidates
shown in the UI are exactly the ones the Worker and the eval harness would report for the same turn: at
most one entry per candidate, keeping the highest-scoring occurrence, ordered by descending score.

#### Scenario: Answer with retrieved CVs

- **WHEN** an assistant message carries retrieval results for several candidates
- **THEN** each distinct candidate is shown once, ordered from the highest score down

#### Scenario: A candidate appears in more than one retrieval result

- **WHEN** the same candidate appears in two retrieval results within one turn
- **THEN** the candidate is shown once, with the higher score deciding the position

#### Scenario: Answer names a candidate the retrieval did not return

- **WHEN** the answer's text mentions a name that appears in no retrieval result for that turn
- **THEN** no source is shown for that name

#### Scenario: Retrieval failed

- **WHEN** a turn's retrieval result reports an error instead of candidates
- **THEN** that turn shows no cited CVs, and the answer is still displayed

### Requirement: Every answer displays its cited CVs inline, identified by candidate name

The system SHALL display, with each assistant message that has cited CVs, one entry per candidate
showing that candidate's name.

#### Scenario: Answer with sources

- **WHEN** an assistant message has cited CVs
- **THEN** an entry per candidate is shown with that message, each labelled with the candidate's name

#### Scenario: Answer without sources

- **WHEN** an assistant message has no retrieval results — an out-of-scope decline, a greeting, or a
  question answered without searching
- **THEN** no source entries are shown for that message

### Requirement: The source panel shows the cited CVs of the most recent answered turn

The system SHALL list, in a dedicated source panel, the cited CVs of the most recent assistant message
that has any, and MUST replace that list when a later turn produces its own.

The panel is scoped to the current answer rather than accumulating the whole conversation, so it always
answers "which CVs support the answer I am reading".

#### Scenario: A turn produces sources

- **WHEN** an answer with cited CVs completes
- **THEN** the source panel lists that turn's candidates

#### Scenario: A later turn produces its own sources

- **WHEN** a subsequent answer cites a different set of candidates
- **THEN** the panel shows the newer set and no longer shows the previous one

#### Scenario: No answer has sources yet

- **WHEN** the conversation is empty, or no answer has cited any CV
- **THEN** the panel shows that no CVs have been cited yet, rather than an empty area with no
  explanation

### Requirement: A cited CV opens the candidate's PDF

The system SHALL make every cited CV open that candidate's generated PDF, resolving the URL from the
file path the retrieval result carries.

The path is repo-relative as `rag` recorded it at ingestion time; the app is the only module that turns
it into a URL, so `agent` stays unaware of how files are served.

#### Scenario: Opening a cited CV

- **WHEN** the user activates a cited CV entry
- **THEN** that candidate's PDF opens, in a new browsing context, leaving the conversation intact

#### Scenario: URL derived from the retrieval result's path

- **WHEN** a retrieval result's path points at a CV inside the generated data directory
- **THEN** the entry's target is that file as served by the app, without the app consulting the CV
  manifest or any other index

#### Scenario: The PDF is missing

- **WHEN** the generated data directory has no file at that path
- **THEN** the entry is still shown and activating it fails only on the file itself, leaving the
  conversation usable

### Requirement: Cited CVs survive a page reload

The system SHALL show each earlier answer's cited CVs after a reload, deriving them again from the
replayed conversation rather than from any client-side store.

#### Scenario: Reload with earlier answers

- **WHEN** the user reloads the page and the agent replays a conversation whose answers cited CVs
- **THEN** those answers show the same cited CVs as before the reload
