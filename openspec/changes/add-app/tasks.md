# Tasks: add-app

Every task under `src/app/` follows `docs/tdd.md`: the failing test comes first, then the minimum
implementation that satisfies it. Tasks in group 1 are config/tooling and are exempt, per that doc's
own exception. Commit per group, keeping `pnpm test` and `pnpm lint` green — the phase plan's risk
table calls for atomic commits by layer.

## 1. Setup & tooling (no tests: config only)

- [x] 1.1 Add exact-version dependencies: `react`, `react-dom`, `@ai-sdk/react` (satisfying
      `@cloudflare/ai-chat@0.12.0`'s peer range); dev deps `vite`, `@vitejs/plugin-react`,
      `@types/react`, `@types/react-dom`, `jsdom`, `@testing-library/react`,
      `@testing-library/user-event`. Verify no `^`/`~` slipped into `package.json`.
- [x] 1.2 Create `tsconfig.app.json` (`lib` with `DOM`/`DOM.Iterable`, `jsx: react-jsx`,
      `types: ["vite/client"]`, `include: ["src/app"]`) and add `src/app` to the root
      `tsconfig.json`'s `exclude`, mirroring the existing `src/agent` split (design Decision 11).
- [x] 1.3 Create `vite.config.ts` at the repo root: `root: "src/app"`, `publicDir` pointing at the
      repo's `data/`, `plugins: [react()]`, `@app`/`@agent` aliases matching `tsconfig.json`, and
      `server.proxy` for `/agents` with `ws: true` → `http://localhost:8787` (Decisions 2 and 3).
- [x] 1.4 Add `"dev:app": "vite"` to `package.json` scripts.
- [x] 1.5 Convert `vitest.config.ts` to two `test.projects` — `node` for
      `src/{feed,rag,agent}/**/*.test.ts` and `app` for `src/app/**/*.test.{ts,tsx}` with
      `environment: "jsdom"` — sharing the existing aliases. Confirm `pnpm test` still runs the
      whole suite and every existing test passes unchanged.
- [x] 1.6 Create `src/app/index.html` (Vite entry document) and `src/app/styles/global.css` (reset,
      CSS custom properties for color/spacing/typography, base type scale) per design Decision 13.

## 2. Source derivation (pure functions, `src/app/sources/`)

- [x] 2.1 Red→green `sources/pdf-url.ts`: a repo-relative CV path becomes the app's URL (`data/` →
      `/`), a path without that prefix is returned unchanged (`app-sources`: URL derived from the
      retrieval result's path).
- [x] 2.2 Red→green `sources/message-sources.ts`: an assistant `UIMessage`'s `tool-scan-cv` parts
      become `SourceReference[]` via `extractSources` imported from `@agent/extraction/extract-sources`
      — covering several candidates ordered by score, the same candidate twice (higher score wins), a
      message with no tool part, and a tool part whose output is an `{ error }` object
      (`app-sources`: derived from retrieval results; retrieval failed).
- [x] 2.3 Red→green the "most recent answered turn" selection used by the source panel: given a
      message list, return the last assistant message's sources that are non-empty, and an empty
      result when none has any (`app-sources`: panel shows the most recent answered turn).

## 3. Atoms (`src/app/ui/atoms/`)

- [x] 3.1 Red→green `Button` (variants, `disabled`, `type`, `onClick`) with its CSS Module + JSDoc
      usage example.
- [x] 3.2 Red→green `Input` (value, `onChange`, `onKeyDown`, `placeholder`, `disabled`).
- [x] 3.3 Red→green `Text` and `Heading` (level, variants).
- [x] 3.4 Red→green `Container` — the layout primitive every molecule and organism wraps in, so no
      raw DOM element is needed above the atom layer (`app-chat`: atomic composition).
- [x] 3.5 Red→green `Badge` and `Spinner`.
- [x] 3.6 Red→green `Link` (href, external target) — the atom a source entry composes to open a PDF
      in a new browsing context (`app-sources`: opening a cited CV).

## 4. Molecules (`src/app/ui/molecules/`)

- [x] 4.1 Red→green `SearchBar`: local input state, submits on the send control and on Enter, does
      not submit empty or whitespace-only text, clears after submitting, disabled while a turn is in
      progress (`app-chat`: question submitted / empty question / keyboard / turn in progress).
- [x] 4.2 Red→green `SourceBadge`: renders the candidate's name and targets the candidate's PDF in a
      new browsing context (`app-sources`: inline cited CVs, opening a cited CV).
- [x] 4.3 Red→green `RetrievalStatus`: renders "searching the CVs" for a pending retrieval tool part
      and nothing once that part has a result, driven by the part's state (`app-chat`: retrieval shown
      as progress).
- [x] 4.4 Red→green `ErrorBanner`: renders a persistent failure message (design Decision 10).
- [x] 4.5 Red→green `ChatMessage`: renders a message part by part — text parts as text, a retrieval
      tool part through `RetrievalStatus` — distinguishes user from assistant, and renders the
      message's cited CVs as `SourceBadge`s, none when there are none (`app-chat`: answer arrives in
      fragments, retrieval progress; `app-sources`: inline cited CVs, answer without sources).

## 5. Session context & the chat hook

- [x] 5.1 Red→green `context/chat-context.tsx`: provides a `sessionId` read from `localStorage`,
      generates and stores one when absent, reuses the stored one on a later render, and
      `startNewConversation()` replaces it with a new one (`app-chat`: first visit, returning visit,
      new conversation).
- [x] 5.2 Red→green `hooks/useScannerChat.ts` with `agents`/`@cloudflare/ai-chat` mocked: composes
      `useAgent({ agent: "scanner-agent", name: sessionId })` with `useAgentChat`, exposes
      `{ messages, ask }`, and derives exactly one state — `streaming` while the SDK reports a stream,
      `error` on a connection or turn failure, `idle` otherwise — never storing it (`app-chat`: turn in
      progress, failures, recovery). Assert it keeps no transcript of its own in browser storage.

## 6. Organisms (`src/app/ui/organisms/`)

- [x] 6.1 Red→green `ChatPanel`: renders the message list from the messages it is given, shows a
      `Spinner` while a turn is in progress, an `ErrorBanner` on failure, and hands submissions to its
      `onAsk` prop — with `useScannerChat` mocked via in-memory `UIMessage` fixtures including one
      carrying a `tool-scan-cv` part (design Decision 12).
- [x] 6.2 Red→green `SourcePanel`: lists the cited CVs it is given as `SourceBadge`s, and states that
      no CVs have been cited yet when the list is empty (`app-sources`: panel scenarios).

## 7. Page & integration

- [x] 7.1 Red→green `pages/ChatPage/ChatPage.tsx`: composes `ChatPanel` and `SourcePanel`, feeds the
      panel the most recent answered turn's sources (task 2.3), and exposes the "New conversation"
      control wired to `startNewConversation()` (`app-chat`: new conversation).
- [x] 7.2 Red→green `src/app/main.tsx` mounting `ChatProvider` + `ChatPage` — the module's only root
      file, with no `App.tsx` and no barrel `index.ts` (design Decision 13).
- [x] 7.3 Red→green an integration test at the page level with `useScannerChat` mocked: type a
      question → it appears as a user message → a streamed answer with a retrieval tool part renders
      → its cited CVs appear inline and in the panel → a badge targets the candidate's PDF. Add the
      reload case: mounting with a replayed history re-derives each answer's cited CVs
      (`app-sources`: cited CVs survive a page reload).

## 8. Manual verification (no automated coverage, by design)

- [x] 8.1 With `pnpm dev:agent` and `pnpm dev:app` both running and `data/` populated: ask a corpus
      question, confirm the answer streams, the retrieval indicator appears then clears, the cited CVs
      appear inline and in the panel, and a badge opens the right PDF.
      Verified at the protocol level (no browser tool available in this environment): both dev
      servers started for real against the populated `data/`; a raw WebSocket client opened
      `ws://localhost:5173/agents/scanner-agent/<id>` (through the Vite proxy, `ws: true`) and sent
      the exact `cf_agent_use_chat_request` frame `useAgentChat` sends. The response streamed a
      `tool-input-available`/`tool-output-available` pair for `scan-cv` with real candidates, then a
      grounded, streamed answer citing those same candidates — confirming retrieval-then-answer over
      the proxied path the browser UI uses. `curl http://localhost:5173/cvs/<id>.pdf` confirmed the
      `publicDir` serves the PDF a badge would link to.
- [x] 8.2 Confirm the session behaviors against the real Worker: reload resumes the conversation, a
      follow-up question resolves a pronoun against the previous turn, and "New conversation" yields
      an empty chat while the previous session's history remains in its own Durable Object.
      Verified structurally: `GET /agents/scanner-agent/<same-id>/get-messages` (the endpoint
      `useAgentChat`'s `getInitialMessages` calls) through the proxy returned the exact persisted
      `tool-scan-cv` part from 8.1's turn, in the shape `sourcesFromMessage` expects — confirming a
      reload replays history with re-derivable sources. "New conversation" mints a new `sessionId`
      (unit-tested in `ChatPage.test.tsx`), which is a different Durable Object by construction — the
      previous session's history was independently confirmed still present via `get-messages`.
      Pronoun resolution across turns is `agent`'s own behavior (`add-agent`, already verified there)
      and out of scope for this change to re-verify.
- [x] 8.3 Confirm the failure path: stop the Worker → the error banner appears and no spinner is left
      running; restart it → a new question succeeds.
      Verified at the protocol level: with the Worker process killed, a WebSocket connect through the
      Vite proxy fired an `error` event (what `useAgent` surfaces as `connectionError`, which
      `useScannerChat` derives into `state: "error"`, rendering `ErrorBanner` per `ChatPanel`'s
      unit tests). Restarting the Worker and repeating 8.1's request succeeded again.
- [x] 8.4 Confirm an out-of-scope question (for example a weather question) is declined with no
      retrieval indicator and no cited CVs, matching `agent-orchestration`'s scope contract as seen
      from the UI.
      Verified: the same WebSocket flow with "What's the weather like in Paris today?" produced no
      `tool-input-available` chunk and a declining answer ("I cover questions about the candidate CV
      collection only... Weather questions are outside my scope."), so no `RetrievalStatus` or
      `SourceBadge` would render for that turn.

## 9. Documentation & closing checks

- [x] 9.1 Write `context/app.md` as-built: module layout, the component hierarchy, the
      `useScannerChat` → SDK → Worker flow with a Mermaid diagram, how sources are derived and turned
      into URLs, the configuration (three tsconfigs, two Vitest projects, the proxy, `publicDir`), and
      the recorded manual verification from group 8.
- [x] 9.2 Write `src/app/README.md`: prerequisites (`data/` populated, the Worker running), the two
      dev commands, the ports, and where each component layer lives.
- [x] 9.3 Update `AGENTS.md`: §1 status (`app` implemented, Fase 3 UI done), §2 `pnpm dev:app` and
      the two-process requirement, §3 Tech Stack (React 19 + Vite + `@ai-sdk/react`, jsdom/Testing
      Library, versions pinned), §4 Documentation Map rows for `app` and `context/app.md`.
- [x] 9.4 Update `docs/architecture.md`: §4's App open questions become decided (framework, how `app`
      talks to `agent`, how sources are rendered), and §2 records the single narrow exception allowing
      `app` to import `@agent/extraction/extract-sources` — with the prohibition on importing
      `src/agent/index.ts` from the browser.
- [x] 9.5 Correct `docs/atomic-design.md` §5's `__tests__/` layout to colocated tests, matching
      `docs/code-conventions.md` and the rest of the repo (design Decision 13).
- [x] 9.6 Run `pnpm lint` and `pnpm test`; type-check all three projects
      (`tsc --noEmit` per `tsconfig.json`, `tsconfig.agent.json`, `tsconfig.app.json`); confirm
      `AGENTS.md` and `docs/` match reality and that `openspec validate --changes add-app` passes.

## 10. Chat-style presentation refinement (added after group 9's manual review)

Requirement revision, recorded in `specs/app-chat/spec.md` (chat bubbles, formatted answer text) and
`specs/app-sources/spec.md` (cited CVs in the panel only, portrait per entry), with design Decisions 8
(revised), 15, 16 and 17. Same TDD rule as every other `src/` group.

- [x] 10.1 Red→green `ui/atoms/Markdown/parse-markdown.ts`: a pure parser for the subset the agent
      emits — paragraphs, `-`/`*` bulleted and `1.` numbered lists, and inline `**strong**`,
      `*emphasis*`, `` `code` `` — with unsupported or half-streamed markup falling through as literal
      text (`app-chat`: answer listing candidates / answer in prose / partial markup mid-stream).
- [x] 10.2 Red→green the `Markdown` atom rendering those blocks as elements (no
      `dangerouslySetInnerHTML`), plus its CSS Module (Decision 16).
- [x] 10.3 Red→green `ui/atoms/Avatar/Avatar.tsx`: a round portrait with an accessible name, falling
      back to the candidate's initials when the image fails to load (`app-sources`: portrait cannot be
      displayed).
- [x] 10.4 Red→green `sources/photo-url.ts`: a candidate id becomes `/photos/<id>.png`, mirroring
      `pdf-url.ts` (Decision 17).
- [x] 10.5 Red→green `ui/molecules/SourceEntry` (`git mv` from `SourceBadge`): a row composing `Avatar`
      with the candidate's name as the link to their PDF in a new browsing context (`app-sources`: each
      entry shows the portrait beside the name; opening a cited CV).
- [x] 10.6 Red→green `ChatMessage`: one bubble per message, aligned and filled by role, the author still
      stated as text, assistant text through `Markdown` and user text literal through `Text` — and **no**
      source entries, with `sourcesFromMessage` no longer imported (`app-chat`: user/assistant message,
      author beyond colour and position; `app-sources`: answer with sources shows none inline).
- [x] 10.7 Red→green `SourcePanel`: the given sources as a vertical list of `SourceEntry` rows, one per
      candidate (`app-sources`: one entry per row).
- [x] 10.8 Update `ChatPage`'s integration test: a turn's candidates now appear exactly once, in the
      panel, and that entry's name targets the PDF (`app-sources`: panel only, reload).
- [x] 10.9 Add the bubble, avatar, and chat-surface tokens to `styles/global.css` and style
      `ChatPanel`/`SourcePanel`/`ChatPage` around them, keeping the palette restrained (Decision 15).
- [x] 10.10 Update `context/app.md` (layout, dependency graph, the `SourceBadge` → `SourceEntry` rename,
      the new atoms and `photo-url.ts`) and `docs/atomic-design.md` §5's structure; re-run `pnpm lint`
      and `pnpm test`.
- [x] 10.11 Give the content room inside the viewport and dim the palette: cap `ChatPage` at
      `--content-max-width` with `--spacing-8` of page padding (one column below 60rem), widen the panel,
      bubble and field padding, and replace the white-based palette with three warm low-brightness
      surfaces — re-checking every foreground token against the darkest surface it lands on, which is
      what `--color-text-muted`/`--color-danger` were darkened for (Decision 15).
- [x] 10.12 Make the source panel and the conversation the same height: move the "New conversation"
      control into a `ChatPage` header row spanning both columns, leave a single row holding both panels,
      and move the card chrome from `ChatPanel`'s message list onto `ChatPanel` itself, so the composer
      sits inside the card and both panels share one grid row.
- [x] 10.13 Make the interactive controls visible against the dimmed palette: add
      `--color-border-strong` (3:1 against every surface, WCAG 1.4.11), give the secondary `Button` a
      `--color-surface` fill with that border and a hover state, and apply the same border to `Input`.
