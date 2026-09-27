# Design: add-app

## Context

`agent` landed as a Cloudflare Worker: a `ScannerAgent` Durable Object that streams a grounded answer
over `@cloudflare/ai-chat`'s chat protocol and persists the conversation in its own SQLite. Its
surface has been driven manually (a one-off Node script using `agents/client`), never by a browser.

`app` is the fourth and last `src/` module. It owns the chat UI and nothing else:
`docs/architecture.md` §2 says `app` only calls `agent`'s query interface, and `docs/atomic-design.md`
already fixes the component architecture (atoms → molecules → organisms → page, CSS Modules + BEM,
no raw JSX above the atom layer). `plans/phase3-agent-ui-implementation.md` PR 2 sketched the module;
this design corrects it where investigation contradicted it.

What the investigation established, and what the rest of this document builds on:

- **The tool results already reach the browser.** `streamAgent`'s `toUIMessageStreamResponse()` emits
  `tool-scan-cv` parts carrying the full `{ candidateId, candidateName, source, content, score }[]`
  output, and `AIChatAgent` persists them inside the assistant message. Sources therefore need no new
  transport and no change to `agent`.
- **`@cloudflare/ai-chat/react` is a re-export** of `agents/chat/react`, with peer dependencies
  `react@^19` and `@ai-sdk/react@^3 || ^4`. `useAgentChat` is *not* a hook this repo writes.
- **DOM types cannot join either existing `tsc` program.** The repo already runs two configs because
  `@cloudflare/workers-types` and `@types/node` conflict; `app` needs `lib: DOM` plus `jsx`, so it
  becomes a third.
- **Vitest 5 has no `environmentMatchGlobs`.** Running some tests under `jsdom` and the rest under
  Node requires `test.projects`.

Constraints inherited: exact dependency versions (`.npmrc` `save-exact=true`), TDD per
`docs/tdd.md`, no loose files per `docs/code-conventions.md`, and no deployment target.

## Goals / Non-Goals

**Goals:**

- A person can ask a question in natural language and watch a grounded answer stream in.
- Every answer shows which CVs it used, and each one opens as a PDF in one click.
- A refresh resumes the conversation; the client stores no chat history of its own.
- Loading and error states are visible and distinguishable (connecting, streaming, failed).
- The component tree obeys `docs/atomic-design.md`, including the no-raw-JSX-above-atoms rule.
- `pnpm test` and `pnpm lint` stay green with no credentials and no running Worker.

**Non-Goals:**

- Deployment, `vite build` in any workflow, or serving the app from the Worker.
- Auth, multi-user, or any client-side persistence beyond `sessionId` in `localStorage`.
- Dark mode, mobile layout, chat export, editing a previous question, confidence indicators.
- A component library, Storybook, a design system, or a state-management library.
- Browser-driven E2E (Playwright); the full flow is verified manually, once, and recorded.
- Changing anything in `agent` or `rag`.

## Decisions

### Decision 1 — Vite + React 19, plain: no meta-framework, no UI library

`pnpm dev:app` runs `vite` against a React 19 SPA. No router (one screen), no component library, no
state library — `useState`, `useContext`, and the hooks the agents SDK provides.

React 19 is not a free choice: `@cloudflare/ai-chat` and `agents` both declare `react@^19` as a peer,
and `@ai-sdk/react@^4` is the transport layer `useAgentChat` is built on. Choosing the UI framework
here is really choosing to use the agent SDK's own client instead of reimplementing its wire protocol
(Decision 4).

*Alternatives considered:*

- **Next.js.** Rejected: it brings a server runtime the architecture explicitly does not want (the
  Worker is already the backend), a build step, and routing/SSR concerns for a single screen.
- **A plain server-rendered page** (listed as an open question in `docs/architecture.md` §4).
  Rejected: the product's core behavior is a *streamed* answer with incremental rendering. Without a
  client framework we would hand-write SSE/WebSocket plumbing that `useAgentChat` already ships.
- **Svelte / Vue / vanilla + Vite.** Rejected: the SDK's chat client is React-only, so any other
  choice means reimplementing stream handling, resumption, and history replay by hand. Also
  `AGENTS.md` already committed the frontend stack to React.

### Decision 2 — Vite root is `src/app`; the repo's `data/` is the public directory

```
vite.config.ts   (repo root)
  root:      src/app          → src/app/index.html is the entry document
  publicDir: <repo>/data      → data/cvs/nikita-crist.pdf served at /cvs/nikita-crist.pdf
  plugins:   [react()]
  resolve.alias: @app, @agent (mirroring tsconfig paths, as vitest.config.ts already does)
```

Pointing `publicDir` at `data/` is what makes a source badge a plain link: `SourceReference.source`
is `"data/cvs/<id>.pdf"` (repo-relative, written by `rag` at ingestion time), so the URL is
`source` with its `data/` prefix replaced by `/` — one pure function, unit-testable without a browser
(Decision 7). `data/` is gitignored and regenerated by `pnpm generate:cvs`, so nothing is committed
and nothing is copied anywhere.

*Alternatives considered:*

- **Serve the PDFs from the Worker** (Wrangler `assets`). Rejected: it puts a static-file concern
  inside the module whose job is orchestration, and requires the app to know a second origin.
- **`vite-plugin-static-copy` or a symlink into `src/app/public/`.** Rejected: an extra dependency,
  or an untracked symlink, to achieve exactly what `publicDir` does natively.
- **Vite root at the repo root.** Rejected: it exposes the whole repository over the dev server and
  puts `index.html` somewhere that belongs to no module.
- **Serving only `data/cvs`** so the manifest is not reachable. Rejected as unnecessary: the dev
  server is local-only, and `data/photos` being reachable is what lets a later avatar work at all.

### Decision 3 — The Worker is reached through a Vite proxy, not a configured host

```ts
server: { proxy: { "/agents": { target: "http://localhost:8787", ws: true } } }
```

Every request and the WebSocket upgrade are same-origin, so there is no CORS configuration on the
Worker, no `host` option threaded through the hooks, and no `VITE_*` variable. `wrangler dev`'s port
is the single piece of coupling, and it lives in one line of `vite.config.ts`.

*Alternatives considered:*

- **`useAgent({ host: import.meta.env.VITE_AGENT_HOST })`.** Rejected: it introduces a second
  environment file (`.env` is read by Node and Wrangler, not by Vite's client bundle, so this would
  need `VITE_`-prefixed variables) and forces CORS headers into the Worker — a change to `agent` for
  the app's convenience.
- **Running both from one process** (Wrangler serving the built app). Rejected: it means a build step
  before every UI change, losing HMR, and `wrangler deploy` remains out of scope anyway.

### Decision 4 — `useAgent` + `useAgentChat` own the transport and the history; the client stores neither

One wrapper hook, `hooks/useScannerChat.ts`, composes them and is the only place in `src/app` that
imports the agents SDK:

```
useAgent({ agent: "scanner-agent", name: sessionId })   → WebSocket /agents/scanner-agent/<sessionId>
        │
useAgentChat({ agent })                                 → messages, sendMessage, status, clearHistory
        │                                                  + initial history replayed from the DO
        ▼
{ messages, ask, state: "idle" | "streaming" | "error", errorMessage }
```

The client renders `messages` and holds no copy: history is the Durable Object's SQLite, replayed on
connect, which is what makes a refresh resume the conversation. The plan's
`hooks/useAgentChat.ts` is corrected here — that name belongs to the package; ours is
`useScannerChat`, and it exists to narrow the SDK's wide return value to what the organisms need.

*Alternatives considered:*

- **Hand-rolled `fetch` + SSE parsing against the DO's HTTP endpoint.** Rejected: it reimplements
  history replay, stream resumption, and message-part assembly, all of which the SDK already does and
  which `agent` was built against.
- **Mirroring messages into React state or `localStorage`.** Rejected: two stores of the same truth,
  and the DO's copy is the one the model actually sees on the next turn. The plan already ruled this
  out; this design keeps it.
- **Exposing the SDK's return value directly to organisms.** Rejected: organisms would depend on the
  SDK's surface, making them untestable without mocking the package, and coupling every component to
  a transport detail.

### Decision 5 — Session identity: a `localStorage` UUID; "New conversation" mints a new one

`context/ChatContext.tsx` provides `sessionId`, read from `localStorage` on first render
(`crypto.randomUUID()` when absent) and a `startNewConversation()` that writes a fresh one. A new id
means a new, empty Durable Object; the previous conversation stays intact in its own DO, unreachable
from the UI but not destroyed.

*Alternatives considered:*

- **`clearHistory()` from `useAgentChat`.** It wipes the same DO's persisted history. Rejected as the
  primary action: destroying data is a worse default than leaving it behind, and one Durable Object
  per browser hides the fact that sessions are the DO's addressing model — the thing this module is
  meant to demonstrate. Available later as a separate control if wanted.
- **Both actions.** Rejected for scope: two controls, two behaviors to spec and test, for a demo with
  one screen.
- **A server-minted session id.** Rejected: it needs an extra endpoint on `agent` and gains nothing —
  the DO is created lazily by name on first connect.

### Decision 6 — Sources are derived in the browser by reusing `agent`'s `extractSources`

Each assistant `UIMessage` carries its `tool-scan-cv` parts. `sources/message-sources.ts` maps those
parts to `{ toolName, output }` and hands them to `extractSources` imported from
`@agent/extraction/extract-sources`:

```
message.parts.filter(isToolUIPart)  →  [{ toolName: "scan-cv", output }]  →  extractSources  →  SourceReference[]
```

`extractSources` is pure — no `fs`, no network, no SDK — so it runs unchanged in a browser, and the
de-duplication-by-candidate and score ordering rules exist in exactly one place for the Worker, the
future eval harness, and the UI.

This is a **deep import across a module boundary**, which `docs/architecture.md` §2 narrows to "`app`
only calls `agent`'s query interface". It is admitted deliberately and on these terms: the import is
one pure function plus its `SourceReference` type, read-only, and it may never reach for anything else
in `agent` — in particular never `@agent` / `src/agent/index.ts`, which is the Worker entry and would
drag `agents` and the `cloudflare:` module scheme into the browser bundle. `docs/architecture.md` and
`AGENTS.md` record the exception so it is a decision, not a drift.

*Alternatives considered:*

- **A private copy of the derivation inside `src/app`.** Keeps the boundary pristine. Rejected: two
  definitions of "what counts as a source" that must agree forever, and the second one has no test
  coverage in the module that actually defines the rule.
- **`agent` emits explicit `data-sources` parts on the stream.** Rejected: it reopens the merged PR 1
  (a change to `orchestration/query.ts` plus a delta on `agent-orchestration`) to send information the
  stream already carries, and conversations already persisted would not have the new part.
- **Re-deriving sources from `runAgent`.** Not applicable: the browser never calls it.

### Decision 7 — The PDF URL is built in `app`, from `source`, by a pure function

`sources/pdf-url.ts`: `pdfUrl(source)` replaces a leading `data/` with `/`, yielding
`/cvs/<id>.pdf` for the Vite public directory (Decision 2), and returns the input unchanged if the
prefix is absent. `agent` keeps sending a repo-relative path and stays ignorant of how anything is
served — the same reason `add-agent` Decision 8 left URL construction to the consumer.

*Alternatives considered:*

- **`agent` returns a URL.** Rejected: it would bake the dev server's layout into the orchestration
  module, and the eval harness has no URLs at all.
- **Fetching `data/manifest.json` in the browser to map ids to paths.** Rejected: `retrieve` already
  carries `source`, and `docs/architecture.md` §2 keeps the manifest a test aid, not a runtime
  dependency.

### Decision 8 — The source panel shows the latest answered turn; badges stay inline per message

Two renderings of the same derivation, for two jobs: a `SourceBadge` under each assistant message
answers "where did *this* claim come from", while `SourcePanel` gives the current answer's candidates
room for a name and a visible link to the PDF.

*Alternatives considered:*

- **Inline badges only.** Fewer components. Rejected: the panel is what makes "which CVs were used"
  legible at a glance, which is the optional-but-scored requirement in `CHALLENGE.md`.
- **A panel accumulating every source in the conversation.** Rejected: it grows without bound and
  stops answering "which CVs support the answer I'm reading", which is the question it exists for.

### Decision 9 — Messages render part-by-part, including the tool call as visible progress

`ChatMessage` iterates `message.parts`: `text` parts render as text, and a `tool-scan-cv` part renders
as a retrieval indicator whose label follows the part's state (`getToolPartState`: searching →
finished). The model's decision to search is therefore visible in the UI, which is the behavior
`add-agent` Decision 4 chose a tool for in the first place.

*Alternatives considered:*

- **Render only `text` parts.** Simpler. Rejected: during the first seconds of a turn there are no
  text parts at all — only the tool call — so the UI would look frozen exactly when it is working.
- **A generic global spinner instead of per-part state.** Rejected: it cannot distinguish "searching
  the CVs" from "writing the answer", and it discards information already in the message.

### Decision 10 — Three states, derived, never stored: `idle`, `streaming`, `error`

`useScannerChat` derives the state from what the SDK reports — `isStreaming` for streaming,
`useAgent`'s `connectionError` or the chat's `error` for error, `idle` otherwise — and the page renders
a `Spinner` or an `ErrorBanner` accordingly. Nothing sets a state variable by hand, so no code path can
leave the UI stuck in "loading".

`ErrorBanner` is added to the molecule inventory (it is a composition of `Text` + `Badge`-ish atoms);
the plan referenced it without placing it in the hierarchy.

*Alternatives considered:*

- **A `useState` state machine updated in handlers.** Rejected: the transitions already exist in the
  SDK's flags; duplicating them invites divergence and stuck states.
- **Toasts for errors.** Rejected: a connection error is persistent, not transient — a dismissible
  toast misrepresents it, and it needs a portal/timer layer for no gain.

### Decision 11 — A third `tsconfig`, and Vitest `projects` for the two environments

```
tsconfig.json        types:[node]              include: src (exclude src/agent, src/app)
tsconfig.agent.json  types:[workers-types]     include: src/agent
tsconfig.app.json    lib:[…,DOM,DOM.Iterable] jsx:react-jsx types:[vite/client] include: src/app
```

`vitest.config.ts` grows two projects: `node` (`src/{feed,rag,agent}/**/*.test.ts`) and `app`
(`src/app/**/*.test.{ts,tsx}`, `environment: "jsdom"`), with the existing aliases shared by both.
`pnpm test` still runs everything in one command.

`jsdom` over `happy-dom`: `@testing-library/react`'s ecosystem targets it, and it is the environment
Vitest documents for React. No `pnpm typecheck` script is added — the app's types are checked by the
editor and by `vite`'s own transform, exactly as `agent`'s are today; adding CI type-checking for
three projects is a separate, module-independent change.

*Alternatives considered:*

- **Add `DOM` to the root `tsconfig.json`.** Rejected: it re-merges the type universes the repo
  deliberately split, and puts browser globals in scope for Node modules like `feed`.
- **`happy-dom`.** Faster, lighter. Rejected: less faithful for the DOM APIs `@testing-library`
  relies on, and a debugging cost the repo has no reason to take on.
- **A separate `pnpm test:app` command.** Rejected: one `pnpm test` is what CI runs and what
  `AGENTS.md` documents.

### Decision 12 — Tests mock at the `useScannerChat` seam; no Worker, no WebSocket, no credentials

`jsdom` provides no WebSocket the SDK can use, and CI has no Worker. So, mirroring `add-agent`
Decision 12's "mock at the model seam":

- **Atoms and molecules** are rendered directly with `@testing-library/react` and asserted on
  behavior (a click calls `onSubmit`, a badge links to the right href), never on snapshots.
- **Organisms and the page** get `useScannerChat` mocked (`vi.mock`) with in-memory `UIMessage`
  fixtures — including one with a `tool-scan-cv` part — so streaming, sources, and error states are
  all reachable without a network.
- **`useScannerChat` itself** is tested with the SDK hooks mocked, asserting only what it adds: the
  derived state and the narrowed shape.
- **`message-sources.ts` and `pdf-url.ts`** are pure and tested as pure functions.

*Alternatives considered:*

- **`msw` + a mock WebSocket server.** Rejected: it tests the SDK's protocol, which `agent` already
  verified manually against the real thing, and adds a dependency plus a class of flake.
- **Snapshot tests for atoms.** Rejected: they assert markup, not behavior, and turn every CSS tweak
  into a diff to approve.

### Decision 13 — Module layout: no `App.tsx`, no barrel `index.ts`; `main.tsx` is the only root file

`docs/code-conventions.md` allows exactly one file at a module root — the entry point — so the Vite
template's `App.tsx`/`App.css` pair is not reproduced. `main.tsx` mounts `ChatProvider` + `ChatPage`
directly, global CSS and design tokens live in `styles/global.css`, and `index.html` sits beside
`main.tsx` because Vite's root must contain the entry document.

```
src/app/
├── index.html                  Vite entry document (root of the Vite root)
├── main.tsx                    the module entry point: mount ChatProvider + ChatPage
├── styles/global.css           reset, CSS custom properties (tokens), base typography
├── context/chat-context.tsx    sessionId (localStorage) + startNewConversation
├── hooks/useScannerChat.ts     the only importer of the agents SDK
├── sources/
│   ├── message-sources.ts      UIMessage parts → SourceReference[] (reuses @agent)
│   └── pdf-url.ts              source path → dev-server URL
├── pages/ChatPage/
├── ui/atoms/{Button,Input,Text,Heading,Badge,Spinner,Container}/
├── ui/molecules/{ChatMessage,SearchBar,SourceBadge,ErrorBanner,RetrievalStatus}/
└── ui/organisms/{ChatPanel,SourcePanel}/
```

Every `.ts`/`.tsx` with behavior gets a colocated `*.test.ts(x)`, never a `__tests__/` tree — the
plan's and `docs/atomic-design.md` §5's `__tests__/` sketch is corrected here, consistent with
`agent` and with `docs/code-conventions.md`.

The plan's `src/app/index.ts` ("export point for `@app/*`") is dropped: the alias resolves paths
directly, so a barrel would only add an import graph nothing needs. `services/pdf-handler.ts` becomes
`sources/pdf-url.ts` — `services/` and `*-handler` name a layer, not a concern.

*Alternatives considered:*

- **The stock Vite scaffold** (`index.html` + `src/main.tsx` + `src/App.tsx`). Rejected: `App.tsx`
  would be a second loose root file whose only job is to render the page component.
- **`docs/atomic-design.md`'s `__tests__/` layout.** Rejected as above; the doc gets corrected as part
  of this change.

### Decision 14 — The no-raw-JSX-above-atoms rule stays a review rule for now

`docs/atomic-design.md` permits "linting **or** code-review discipline". This change takes the review
path and keeps the tooling to what is needed to compile and test. The rule is nonetheless mechanically
checkable (an ESLint `no-restricted-syntax` selector on lowercase `JSXOpeningElement`s under
`molecules|organisms|pages`), and that is recorded here as the obvious next step if it ever drifts.

*Alternatives considered:*

- **Add the ESLint rule now.** It makes the project's headline UI rule executable. Deferred, not
  rejected: the rule needs the atom inventory to exist first to be tuned (`svg` inside `Spinner`,
  `React.Fragment`), and this PR is already the largest of the three.
- **`eslint-plugin-react-hooks`.** Deferred on the same grounds; `useScannerChat` is the only
  non-trivial hook and it is unit-tested.

## Risks / Trade-offs

- **The deep `@agent` import invites more of them** → It is documented in three places (this design,
  `docs/architecture.md`, `AGENTS.md`) as a single named exception covering one pure function, with an
  explicit prohibition on importing `src/agent/index.ts` from the browser. A second such import is a
  design change, not a convenience.
- **PR 2 is the biggest of the three and hard to review at once** → Commit by layer (setup → atoms →
  molecules → organisms/hooks → page → docs), each with its tests green, as the phase plan's risk
  table already prescribes.
- **Mocking at the hook seam means the real WebSocket path is never tested automatically** → Accepted,
  with the same posture `agent` took: a recorded manual end-to-end verification (question → streamed
  answer → sources → PDF opens) is part of this change's closing checklist.
- **`useAgentChat` re-renders per chunk** → Its `throttle` defaults to 50 ms, which is the intended
  behavior; if the message list stutters, `throttle` is one option on one hook, not a refactor.
- **A fresh clone has no `data/`** → `pnpm generate:cvs` + `pnpm ingest:cvs` are already prerequisites
  for `agent`; the app's README and `AGENTS.md` state that an empty `data/` means dead PDF links, and
  a badge whose file is missing simply 404s rather than breaking the page.
- **React 19 / `@ai-sdk/react` peer drift** → Versions are pinned exactly (`save-exact=true`) and
  `@cloudflare/ai-chat@0.12.0` is already installed, so the peer range is satisfied at a known point;
  upgrades are a deliberate act.
- **Two dev servers must run together** → `pnpm dev:agent` and `pnpm dev:app` in two terminals,
  documented in `src/app/README.md` and `AGENTS.md`. A combined script would need a process manager
  dependency for no functional gain.

## Migration Plan

Nothing to migrate — `app` is new and no existing behavior changes. Bring-up order:

1. `pnpm install` (new deps), then `pnpm generate:cvs` + `pnpm ingest:cvs` if `data/` is empty.
2. Terminal 1: `pnpm dev:agent`. Terminal 2: `pnpm dev:app` → http://localhost:5173.
3. Verify manually: ask a corpus question → answer streams with sources → a badge opens the PDF;
   refresh → the conversation is still there; "New conversation" → empty chat; stop the Worker → the
   error banner appears.

Rollback is deleting `src/app/`, `vite.config.ts`, `tsconfig.app.json`, the `dev:app` script, and the
`vitest.config.ts` projects block; no other module imports `app`.

## Open Questions

- **Does the retrieval indicator need the query text** (`scan-cv`'s `input.query`) shown to the user,
  or is "searching the CVs…" enough? Deferred to implementation — the part carries the input either
  way, so this is a copy decision, not an architectural one.
- **`@testing-library/jest-dom`'s matchers** (`toBeInTheDocument`, …) are a convenience over
  `@testing-library/react` alone. Add it only if assertions become unreadable without it; not adopted
  up front, per Decision 14's minimal-tooling posture.
