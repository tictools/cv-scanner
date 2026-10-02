# Spec: app-sources

## Purpose

How a turn's cited CVs are derived from the agent's retrieval results, listed in the source panel, and opened as the candidate's PDF.

## Requirements

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

### Requirement: Cited CVs appear in the source panel only, never alongside the message

The system SHALL present a turn's cited CVs exclusively in the source panel, and MUST NOT render any
source entry within the conversation's messages.

The conversation therefore reads as prose alone. A row of candidate entries repeated under every
answer competed with the answer itself for attention and duplicated, message by message, what the
panel already lists for the turn being read.

#### Scenario: Answer with sources

- **WHEN** an assistant message has cited CVs
- **THEN** that message shows no source entries, and the candidates appear in the source panel

#### Scenario: Answer without sources

- **WHEN** an assistant message has no retrieval results — an out-of-scope decline, a greeting, or a
  question answered without searching
- **THEN** no source entries are shown anywhere for that message

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

### Requirement: Each source entry shows the candidate's CV portrait beside their name

The system SHALL show, for every entry in the source panel, the portrait from that candidate's
generated CV next to the candidate's name, and MUST remain legible when the portrait cannot be
displayed.

The portrait is located from the candidate's identifier, the same way the CV's PDF is, so the panel
still consults no manifest or index.

#### Scenario: Entry with an available portrait

- **WHEN** a candidate's generated portrait can be displayed
- **THEN** the entry shows that portrait beside the candidate's name

#### Scenario: Portrait cannot be displayed

- **WHEN** a candidate's portrait is missing or fails to load
- **THEN** the entry still shows the candidate's name and remains activatable, with a placeholder in
  the portrait's place rather than a broken image

### Requirement: A cited CV opens the candidate's PDF

The system SHALL make the candidate's name, within every source entry, open that candidate's generated
PDF, resolving the URL from the file path the retrieval result carries.

The path is repo-relative as `rag` recorded it at ingestion time; the app is the only module that turns
it into a URL, so `agent` stays unaware of how files are served.

#### Scenario: Opening a cited CV

- **WHEN** the user activates the candidate's name in a source entry
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

The system SHALL show the replayed conversation's cited CVs after a reload, deriving them again from
the replayed messages rather than from any client-side store.

#### Scenario: Reload with earlier answers

- **WHEN** the user reloads the page and the agent replays a conversation whose answers cited CVs
- **THEN** the panel lists the same candidates for the most recent answered turn as before the reload
