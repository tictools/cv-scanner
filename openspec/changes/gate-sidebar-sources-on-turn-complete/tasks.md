## 1. app — sources derivation

- [ ] 1.1 Write failing tests in `src/app/sources/displayed-sources.test.ts`. While `"streaming"`, the in-flight turn's resolved sources are ignored and the previous answered turn's sources are returned. With no previous turn, the result is `undefined`. On `"idle"` and `"error"`, the result equals `latestAnsweredSources(messages)`.
- [ ] 1.2 Implement `displayedSources(messages, state)` in `src/app/sources/displayed-sources.ts` until the tests pass.

## 2. app — wiring

- [ ] 2.1 Add a failing case to `src/app/pages/ChatPage/ChatPage.test.tsx`. With `state: "streaming"` and an assistant message whose `scan-cv` result has landed, the panel still shows the previous turn's sources (or the empty state), and switches once `state` becomes `"idle"`.
- [ ] 2.2 Replace `latestAnsweredSources(messages)` with `displayedSources(messages, state)` in `src/app/pages/ChatPage/ChatConversation.tsx`, and update `SourcePanel`'s JSDoc example.

## 3. Verification

- [ ] 3.1 Verify AGENTS.md, `context/workflow.md` and the `app` docs still match reality, then run `pnpm lint` and `pnpm test`.
