# Spec: app-chat

App module: the chat surface — asking a question, watching the grounded answer stream in, the
idle/streaming/error states, and session identity across reloads.

## ADDED Requirements

### Requirement: A question is sent to the agent and its answer streams into the conversation

The system SHALL send the user's submitted question to the `agent` Worker's chat session and MUST
render the assistant's reply incrementally as it arrives, without waiting for the turn to complete.

The submitted question appears in the conversation as the user's own message before any reply exists,
so the transcript reads as a conversation from the first keystroke onwards.

#### Scenario: Question is submitted

- **WHEN** the user types a question and submits it
- **THEN** the question appears in the conversation as a user message and the input is cleared

#### Scenario: Answer arrives in fragments

- **WHEN** the assistant's reply arrives as a sequence of streamed fragments
- **THEN** the partial answer is visible and grows as fragments arrive, rather than appearing only
  once the turn has finished

#### Scenario: Empty question

- **WHEN** the user submits an empty or whitespace-only input
- **THEN** nothing is sent to the agent and the conversation is unchanged

#### Scenario: Submitting with the keyboard

- **WHEN** the user presses Enter in the question input with non-empty text
- **THEN** the question is submitted, exactly as if the send control had been used

### Requirement: A turn in progress is visible and cannot be interrupted by a second question

The system SHALL indicate that a turn is in progress while the assistant is answering, and MUST NOT
accept a new question until that turn has finished.

#### Scenario: Turn in progress

- **WHEN** the assistant is streaming an answer
- **THEN** a progress indicator is shown and the send control is unavailable

#### Scenario: Turn finished

- **WHEN** the assistant's turn completes
- **THEN** the progress indicator is gone and the input accepts a new question

### Requirement: Retrieval is shown as progress while the agent searches the CVs

The system SHALL show, from the retrieval tool call present in the assistant's message, that the agent
is searching the CV collection, and MUST replace that indication once the search has returned.

This exists because a turn's first seconds contain a tool call and no answer text at all; without it
the interface looks idle while the agent is working.

#### Scenario: Search in progress

- **WHEN** the assistant's message contains a retrieval tool call that has not yet produced a result
- **THEN** the message shows that the CV collection is being searched

#### Scenario: Search returned

- **WHEN** that tool call has produced its result
- **THEN** the message no longer presents the search as in progress

#### Scenario: Turn without retrieval

- **WHEN** the assistant answers without calling the retrieval tool at all
- **THEN** no search indication is shown for that turn

### Requirement: The conversation is the agent's, not the client's

The system SHALL render the conversation history supplied by the agent session and MUST NOT keep its
own copy of the messages in browser storage.

The consequence is that reloading the page resumes the same conversation, including earlier answers
and their cited CVs, because the history lives in the agent's session.

#### Scenario: Page reload

- **WHEN** the user reloads the page during an existing conversation
- **THEN** the earlier questions and answers are shown again as the agent replays them

#### Scenario: No client-side transcript

- **WHEN** the conversation contains messages
- **THEN** no transcript of them is written to browser storage

### Requirement: The session identity persists across reloads and a new conversation mints a new one

The system SHALL identify its chat session with an identifier persisted in the browser, reusing it on
every subsequent load, and MUST start a new, empty conversation under a newly generated identifier
when the user asks for one.

Starting a new conversation leaves the previous session's history untouched in the agent rather than
deleting it.

#### Scenario: First visit

- **WHEN** the app loads with no session identifier stored
- **THEN** one is generated, stored, and used to open the chat session

#### Scenario: Returning visit

- **WHEN** the app loads with a session identifier already stored
- **THEN** that same identifier is used, so the agent replays the existing conversation

#### Scenario: New conversation

- **WHEN** the user starts a new conversation
- **THEN** a new identifier is generated and stored, and the conversation area is empty

### Requirement: Connection and streaming failures are reported and never leave the interface stuck

The system SHALL present a visible, persistent error message when the agent session cannot be reached
or a turn fails, MUST NOT present the failure as an answer, and MUST leave the interface able to
accept a question again once the failure has passed.

The interface is in exactly one of three states at any time — idle, answering, or failed — and each
state is derived from the agent session's reported status rather than tracked separately, so no failure
path can leave a progress indicator running forever.

#### Scenario: Agent unreachable

- **WHEN** the agent Worker is not running or the connection drops
- **THEN** an error message says the assistant cannot be reached, and no progress indicator remains
  visible

#### Scenario: Turn fails mid-answer

- **WHEN** a turn fails after partial text has been shown
- **THEN** an error message is shown and the partial text is not presented as a finished answer

#### Scenario: Recovery

- **WHEN** the agent becomes reachable again after a failure
- **THEN** the error message is gone and a new question can be submitted

### Requirement: The interface composes only from the atomic component hierarchy

The system SHALL build every molecule, organism, and page exclusively from atoms and lower-level
components, and MUST NOT emit raw DOM elements above the atom layer, per `docs/atomic-design.md`.

#### Scenario: A molecule, organism, or page needs a wrapper or a control

- **WHEN** a component above the atom layer needs layout, text, or an interactive control
- **THEN** it composes the corresponding atom rather than emitting a DOM element directly

#### Scenario: A needed primitive has no atom

- **WHEN** a component above the atom layer needs a primitive that no atom provides
- **THEN** the atom is added to `src/app/ui/atoms/` and composed, rather than the DOM element being
  emitted in place
