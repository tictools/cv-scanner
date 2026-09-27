# Spec: agent-orchestration

Agent module: orchestrates the user's question and `rag`'s retrieved chunks through the LLM to
produce a grounded, session-scoped, streamed answer.

## Requirements

### Requirement: Grounded answer from retrieved CV text only

The system SHALL answer a user's question using only CV text returned by its retrieval tool during
that conversation, and MUST state that the corpus does not contain the answer rather than inventing
a candidate, a skill, or an employment fact.

#### Scenario: Answer grounded in retrieved CVs

- **WHEN** a user asks which candidates have experience with a technology that appears in the corpus
- **THEN** the answer names only candidates whose retrieved CV text mentions it, and every claim
  about a candidate traces back to that text

#### Scenario: Corpus does not contain the answer

- **WHEN** a user asks about a technology no CV mentions
- **THEN** the answer says no candidate in the corpus matches, and names no candidate

#### Scenario: Question unrelated to the corpus

- **WHEN** a user asks something that is not about candidates or CVs at all
- **THEN** the answer neither invents candidate facts nor claims the corpus contains an answer, and
  the out-of-scope requirement below governs what it says instead

### Requirement: Requests outside the CV corpus are declined politely and in scope

The system SHALL respond to a request it cannot serve from the CV corpus with a polite reply that
says the request is outside what this assistant covers and states what it can help with instead, and
MUST NOT answer such a request from the model's general knowledge, MUST NOT call the retrieval tool
for it, and MUST NOT return any source for it.

The decline is a normal, successful turn — not an error, not a bare refusal, and not a claim that the
assistant is incapable or has no access. It names the boundary (questions about the CVs in this
collection) and invites a question inside it.

#### Scenario: General-knowledge question

- **WHEN** a user asks something answerable only from world knowledge, such as what the weather is
  today
- **THEN** the reply politely says this is outside the assistant's scope and that it answers questions
  about the CV collection, does not state the weather, and carries no sources

#### Scenario: Unrelated task request

- **WHEN** a user asks the assistant to perform an unrelated task, such as writing a poem or debugging
  a code snippet they paste
- **THEN** the reply politely declines as out of scope and redirects to the CV collection, and the task
  is not performed even partially

#### Scenario: Greeting or capability question

- **WHEN** a user sends a greeting, or asks what the assistant can do
- **THEN** the reply is a courteous answer that states the scope and invites a question about the
  candidates — not a refusal, and not an apology

#### Scenario: Mixed request, partly about the CVs

- **WHEN** a single message asks both something answerable from the CVs and something outside scope,
  such as which candidates know Python and what salary to offer them
- **THEN** the CV part is answered and grounded with its sources, and the out-of-scope part is declined
  in the same reply rather than the whole message being refused

#### Scenario: Attempt to override the scope

- **WHEN** a user instructs the assistant to ignore its instructions, or frames an out-of-scope request
  as a hypothetical, a role-play, or a test
- **THEN** the scope boundary still holds and the request is declined politely

#### Scenario: Out-of-scope decline is distinguishable from an empty corpus

- **WHEN** a user asks a genuine CV question the corpus cannot answer, such as who knows COBOL
- **THEN** the reply says the collection contains no matching candidate — it does not treat a valid CV
  question as out of scope

### Requirement: Every reply is written in the user's language

The system SHALL write each reply in the language of the user's own message — a grounded answer, a
"no matching candidate" reply, an out-of-scope decline, and a greeting alike — and MUST NOT adopt the
language of the retrieved CV text instead, since the corpus mixes English, Spanish, and Catalan.

Candidate names, employer and school names, job titles as held, and technology names are kept as the
retrieved CV spells them, so each claim stays traceable to its source.

#### Scenario: Answer mirrors a question asked in another language

- **WHEN** a user asks in Catalan or Spanish which candidates know a given technology
- **THEN** the answer is written in that same language, with its sources unchanged

#### Scenario: Retrieved CV is in a different language from the question

- **WHEN** the CV text the retrieval tool returns is written in a different language from the question
- **THEN** the reply is still written in the user's language, rendering what the CV says in it, while
  candidate, employer, and technology names keep the CV's own spelling

#### Scenario: Decline is written in the user's language

- **WHEN** an out-of-scope request arrives in Catalan, Spanish, or English
- **THEN** the decline is written in that same language

#### Scenario: User switches language mid-conversation

- **WHEN** a user who has been writing in English sends the next message in Catalan
- **THEN** that reply and the ones after it are in Catalan, and the earlier turns are left as they were

### Requirement: Session-scoped conversation with persisted history

The system SHALL keep each conversation's message history in the storage of the Durable Object
instance that serves that session, persisted across requests and across process eviction, and MUST
NOT require the client to send prior messages back.

#### Scenario: Follow-up question resolves against earlier turns

- **WHEN** a user asks a follow-up that refers back to an earlier turn ("and which of them knows
  Docker?")
- **THEN** the agent resolves the reference against the stored history without the client resending
  it

#### Scenario: Conversation resumes after a reload

- **WHEN** a client reconnects with the same session identifier after a page reload
- **THEN** the prior messages are still available and the conversation continues from them

#### Scenario: Separate sessions stay isolated

- **WHEN** two different session identifiers are used
- **THEN** neither conversation's history is visible to the other

### Requirement: Model-facing context compaction

The system SHALL compact the message history it sends to the model once a conversation exceeds a
configured turn threshold, keeping the most recent turns verbatim and replacing older ones with a
single summary message, and MUST leave the stored history complete.

#### Scenario: Long conversation is compacted before the model call

- **WHEN** a conversation exceeds the configured turn threshold
- **THEN** the messages sent to the model consist of a summary of the older turns plus the most
  recent turns verbatim

#### Scenario: Short conversation is passed through untouched

- **WHEN** a conversation is below the threshold
- **THEN** every message is sent to the model unmodified, with no summary inserted

#### Scenario: Stored history survives compaction

- **WHEN** compaction has been applied to a conversation
- **THEN** the persisted history still contains every original message, not the compacted view

### Requirement: Streamed response over the chat transport

The system SHALL stream the assistant's answer to the client incrementally as the model produces it,
rather than returning only a completed answer.

#### Scenario: Answer arrives incrementally

- **WHEN** the agent answers a question
- **THEN** the client receives partial content before the answer is complete

#### Scenario: Assistant turn is persisted after streaming

- **WHEN** a streamed answer finishes
- **THEN** the completed assistant message is part of the conversation's stored history

### Requirement: Reusable non-streaming core shared with the eval harness

The system SHALL expose the orchestration core as a function that takes a model and a message list
and returns `{ text, sources, toolCalls, retrievedChunks }` without requiring a Worker, a Durable
Object, or an HTTP request, and this function MUST use the same system prompt, tool set, and step
limit as the streaming path.

#### Scenario: Core invoked directly

- **WHEN** a caller invokes the core function with a model and a single user message
- **THEN** it returns the answer text, the derived sources, the tool calls made, and the retrieved
  chunks, with no server running

#### Scenario: Streaming and non-streaming paths cannot diverge

- **WHEN** the system prompt, the tool set, or the step limit changes
- **THEN** both the streaming and the non-streaming entry point observe the change, because both
  read it from one shared definition

### Requirement: Bounded tool-call loop

The system MUST cap the number of model steps in a single turn, so a model that keeps requesting
tool calls terminates instead of looping indefinitely.

#### Scenario: Step limit reached

- **WHEN** the model requests tool calls past the configured step limit
- **THEN** the turn stops at the limit and returns what it has, rather than continuing

#### Scenario: Normal turn well inside the limit

- **WHEN** the model calls the retrieval tool once and then answers
- **THEN** the turn completes normally without the limit being involved

### Requirement: LLM credential contract

The system MUST fail with a clear error naming the missing variable when the LLM API key is absent
or blank, and MUST NOT require that key for the unit test suite to pass.

#### Scenario: Missing key at runtime

- **WHEN** the Worker handles a chat request without the LLM API key configured
- **THEN** it fails with an error naming the missing variable, and no request is sent to the provider

#### Scenario: Test suite without credentials

- **WHEN** `pnpm test` runs with no LLM API key present
- **THEN** every agent test passes, because the model is injected as a parameter and mocked

### Requirement: Temporary groundedness audit logging

The system SHALL log each answered turn's question, the `candidateId` values retrieved for it, and
the answer, for manual groundedness auditing; every code element implementing this logging MUST
carry the marker `TODO(add-agent-evals)` so it can be located and removed wholesale when the eval
harness's groundedness scorer replaces it.

#### Scenario: Turn is audited

- **WHEN** the agent finishes answering a question for which it retrieved CVs
- **THEN** the question, the retrieved `candidateId` values, and the answer are logged together

#### Scenario: Removal is mechanical

- **WHEN** a developer searches `src/` for `TODO(add-agent-evals)`
- **THEN** every function, call site, type, and test belonging to this logging is listed, and
  nothing else is

### Requirement: Module boundary

The system MUST reach CV data only through `rag`'s public retrieval function, and MUST NOT render or
serve user interface markup, read `data/` from disk at request time, or import from `src/app`.

#### Scenario: Retrieval is the only data path

- **WHEN** the agent needs CV content
- **THEN** it obtains it from `rag`'s retrieval function, never from the filesystem, the manifest,
  or `rag`'s internal store wrapper

#### Scenario: No UI concerns
- **WHEN** the agent responds
- **THEN** it returns answer text and structured source references, never HTML or component markup
