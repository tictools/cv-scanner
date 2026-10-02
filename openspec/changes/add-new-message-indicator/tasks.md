## 1. app — atoms

- [ ] 1.1 Add a failing case to `src/app/ui/atoms/Container/Container.test.tsx`: a `ref` passed to `Container` receives the rendered element.
- [ ] 1.2 Widen `ContainerProps` to `ComponentPropsWithRef<"div">` until it passes, and update its JSDoc.

## 2. app — indicator molecule

- [ ] 2.1 Write failing tests in `src/app/ui/molecules/NewMessageIndicator/NewMessageIndicator.test.tsx`. It renders a button whose accessible name is "New message", with the "↓" glyph hidden from assistive technology. Activating it, by click or keyboard, calls `onClick`.
- [ ] 2.2 Implement `NewMessageIndicator` (composing `Button`), with its CSS Module anchoring it bottom-right, until the tests pass.

## 3. app — scroll hook

- [ ] 3.1 Write failing tests in `src/app/ui/organisms/ChatPanel/hooks/useChatScroll.test.tsx`, stubbing the list's `scrollHeight`/`clientHeight`/`scrollTop` and `scrollTo`. Cover:
  - at the bottom, new assistant content scrolls to the bottom and raises nothing
  - scrolled up, new assistant content raises `hasNewMessage` and doesn't scroll
  - a new user message always scrolls to the bottom
  - a scroll that doesn't reach the bottom keeps `hasNewMessage`
  - a scroll that reaches the bottom clears it
  - `scrollToLatest` calls `scrollTo` with smooth behaviour, or `"auto"` under reduced motion
- [ ] 3.2 Implement `useChatScroll` in `src/app/ui/organisms/ChatPanel/hooks/useChatScroll.ts` until the tests pass.

## 4. app — ChatPanel wiring

- [ ] 4.1 Add failing cases to `src/app/ui/organisms/ChatPanel/ChatPanel.test.tsx`, one per spec scenario. Cover: no indicator at the bottom; the indicator appears when an assistant message arrives while scrolled up; clicking it scrolls to the bottom and it clears on arrival; it stays after a partial scroll; replayed history shows no indicator.
- [ ] 4.2 Wire `useChatScroll` into `ChatPanel`: pass the ref and `onScroll` to the message list, wrap the list and a `RenderOrNull`-gated `NewMessageIndicator` in a positioned `Container`, and update the CSS Module.

## 5. Verification

- [ ] 5.1 Check by hand in the browser (`pnpm dev:agent` + `pnpm dev:app`): placement bottom-right, smooth scroll on click, following a streamed answer at the bottom, and the indicator when scrolled up mid-stream.
- [ ] 5.2 Update `docs/atomic-design.md` (the §3.3 example and §4.6's list of call sites) and `context/workflow.md` if they no longer match reality, then run `pnpm lint` and `pnpm test`.
