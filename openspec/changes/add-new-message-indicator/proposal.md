## Why

`ChatPanel`'s message list never scrolls on its own. If the user has scrolled up to read earlier
history when an answer arrives, nothing signals that new content exists below the viewport, so the
reply can go unnoticed (issue #17). Even a user who stays at the bottom has to scroll manually to
follow a streamed answer.

## What Changes

- The message list follows new content while the user is at its bottom: incoming answers, streamed
  fragments, and the user's own submitted question keep the latest message in view.
- When assistant content arrives while the user is scrolled away from the bottom, a **"New message ↓"**
  indicator appears anchored to the bottom-right of the message list.
- Clicking the indicator scrolls to the latest message. Scrolling down manually also works. The
  indicator disappears once the bottom is reached, by either route, and not before.
- A new molecule for the indicator. A scroll hook colocated with `ChatPanel` per
  `docs/atomic-design.md`. `Container` gains the ability to carry a ref.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-chat` (`app` module): adds a requirement that the conversation follows new content while the
  user is at the bottom, and shows a scroll-to-latest indicator when an answer lands off-screen.

## Non-goals

- An unread-message count, or one indicator per unseen message.
- Restoring a scroll position across reloads or new conversations.
- List virtualization, or any change to how messages are rendered.
- Any change to `agent`, `useScannerChat`, or the source panel.

## Impact

- `src/app/ui/organisms/ChatPanel/`: composes the indicator and wires the new scroll hook under
  `hooks/`.
- `src/app/ui/molecules/`: the new indicator molecule.
- `src/app/ui/atoms/Container/`: accepts a ref so the organism can read and drive the list's scroll
  position without emitting a raw `<div>`.
- No new dependencies, no API changes.
