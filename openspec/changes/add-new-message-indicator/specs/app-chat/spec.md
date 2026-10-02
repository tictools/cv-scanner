## ADDED Requirements

### Requirement: The conversation follows new content at the bottom and flags answers that land off-screen

The system SHALL keep the latest message in view as content arrives while the user is at the bottom
of the conversation, and MUST show a "New message" indicator, with a downward arrow and anchored to
the bottom-right of the conversation, when assistant content arrives while the user is scrolled away
from the bottom.

The indicator stays until the user reaches the bottom, whether by activating it or by scrolling
there themselves. It never moves the conversation unless the user activates it, so reading earlier
history is not interrupted.

#### Scenario: Answer arrives while the user is at the bottom

- **WHEN** the user is at the bottom of the conversation and assistant content arrives, as a new
  message or as streamed fragments of the current one
- **THEN** the conversation scrolls to keep the latest content in view and no indicator is shown

#### Scenario: Answer arrives while the user is scrolled up

- **WHEN** the user has scrolled away from the bottom of the conversation and assistant content arrives
- **THEN** the conversation keeps its scroll position and a "New message" indicator with a downward
  arrow appears at the bottom-right of the conversation

#### Scenario: Activating the indicator

- **WHEN** the user activates the "New message" indicator
- **THEN** the conversation scrolls to the latest message and the indicator disappears

#### Scenario: Scrolling without reaching the bottom

- **WHEN** the indicator is shown and the user scrolls without reaching the bottom of the conversation
- **THEN** the indicator remains visible

#### Scenario: Scrolling manually to the bottom

- **WHEN** the indicator is shown and the user scrolls to the bottom of the conversation by themselves
- **THEN** the indicator disappears

#### Scenario: The user submits a question while scrolled up

- **WHEN** the user submits a question while scrolled away from the bottom of the conversation
- **THEN** the conversation scrolls to show the submitted question, and the reply that follows is
  followed as at the bottom

#### Scenario: History replayed on load

- **WHEN** the agent replays an existing conversation into an empty conversation area, on a reload or
  a returning visit
- **THEN** the conversation ends up showing its latest message and no indicator is shown

#### Scenario: Indicator reachable without a pointer

- **WHEN** the indicator is shown
- **THEN** it is a control that can be reached and activated from the keyboard, and its accessible
  name states that a new message is available
