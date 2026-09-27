# Proposal: add-app

## Why

`agent` answers questions over a WebSocket, but only a throwaway Node script has ever asked one.
`app` is the module that makes the product usable by a person: type a question, watch a grounded
answer stream in, see which CVs it came from, open them. It closes `CHALLENGE.md`'s deliverable and
is the last of the four `src/` modules.

## What Changes

- New **`app`** module under `src/app/`: a Vite + React 19 SPA (`pnpm dev:app`), the repo's first
  browser runtime, talking to the `wrangler dev` Worker through a Vite proxy so everything is
  same-origin.
- **The agent's chat protocol is consumed as-is**: `useAgent` + `useAgentChat`
  (`@cloudflare/ai-chat/react`) open the WebSocket to the `ScannerAgent` Durable Object keyed by a
  `sessionId` kept in `localStorage`. The client holds **no chat history of its own** — it renders
  what the Durable Object replays, so a refresh resumes the conversation.
- **Sources are derived, not transported**: the stream already carries `scan-cv`'s tool parts, so the
  app reuses `agent`'s pure `extractSources` over each assistant message's parts. No change to
  `agent`, no hallucinated citation possible, and citations survive a reload because they come from
  the persisted message.
- **Atomic Design is enforced structurally**: atoms → molecules → organisms → page, no raw JSX above
  the atom layer (`docs/atomic-design.md`), CSS Modules + BEM.
- **Every CV is one click away**: `data/cvs/` is served by the Vite dev server, so a source badge
  links straight to the candidate's PDF.
- **Tooling grows by three pieces only**: a `tsconfig.app.json` (DOM + JSX types, which cannot share
  a `tsc` program with the Node or Workers types), Vitest `projects` to run the app's tests under
  `jsdom` while the other modules stay on Node, and `pnpm dev:app`.

## Capabilities

### New Capabilities

- `app-chat` (module: **app**): the conversation surface — sending a question, streaming the answer,
  the idle/streaming/error states, session identity and starting a new conversation.
- `app-sources` (module: **app**): how a turn's cited CVs are derived, displayed inline and in the
  source panel, and opened as PDFs.

### Modified Capabilities

None. `agent`'s three specs describe the surface this change consumes; no requirement of theirs
changes.

## Impact

- **Code**: new `src/app/` tree with colocated tests. One deep, read-only import from `agent`
  (`@agent/extraction/extract-sources`) — a documented narrowing of the module boundary, not shared
  runtime code.
- **Config**: `react`, `react-dom`, `@ai-sdk/react` deps; `vite`, `@vitejs/plugin-react`,
  `@types/react`, `@types/react-dom`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event` dev deps; new `vite.config.ts`, `tsconfig.app.json`; `pnpm dev:app`;
  `vitest.config.ts` gains two projects; root `tsconfig.json` excludes `src/app`.
- **Docs**: `AGENTS.md` §1/§2/§3/§4, `docs/architecture.md` §4's open App questions become decided,
  new `context/app.md`, new `src/app/README.md`.
- **Runtime**: `pnpm dev:agent` and `pnpm dev:app` must both be running; `data/` must be populated.

## Non-goals

- Deployment or hosting of either the app or the Worker; `vite build` is not part of any workflow.
- Authentication, multi-user support, or any server-side session store beyond the Durable Object.
- Dark mode, mobile-responsive layout, conversation export, editing a previous question, and
  confidence indicators — all listed as future work in the phase plan.
- A component library, Storybook, or a design system; and no state library (React Context only).
- Playwright or any browser-driven E2E suite — the end-to-end flow is verified manually.
