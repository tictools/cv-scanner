# app

The chat UI: ask a question about the generated CVs, watch a grounded answer stream in, see which
CVs it cited, open them as PDFs. See [context/app.md](../../context/app.md) for the full as-built
reference.

## Prerequisites

- `data/` populated: `pnpm generate:cvs` then `pnpm ingest:cvs` (needs `GEMINI_API_KEY` and the two
  `UPSTASH_VECTOR_REST_*` variables in `.env`). An empty `data/` means dead PDF links and missing
  portraits in the source panel — the entry still renders (the portrait falls back to initials), the
  PDF link just 404s.
- The `agent` Worker running: `pnpm dev:agent` (needs `OPENAI_API_KEY` too).

## Running it

Two terminals:

```
pnpm dev:agent   # http://localhost:8787 — the ScannerAgent Worker
pnpm dev:app     # http://localhost:5173 — this module
```

Open `http://localhost:5173`. The Vite dev server proxies `/agents` (including the WebSocket upgrade)
to the Worker, so everything is same-origin from the browser's perspective — no separate host or CORS
configuration to set.

## Where things live

```
context/chat-context.tsx     session identity (localStorage sessionId, "new conversation")
hooks/useScannerChat.ts      the only file importing the agents SDK
sources/                     pure functions: tool parts → cited CVs, path → PDF URL, id → portrait URL
pages/ChatPage/              the one screen
ui/atoms/                    Button, Input, Text, Heading, Container, Badge, Spinner, Link, Avatar, Markdown
ui/molecules/                SearchBar, SourceEntry, RetrievalStatus, ErrorBanner, ChatMessage
ui/organisms/                ChatPanel, SourcePanel
```

Atomic Design rules (no raw JSX above the atom layer, CSS Modules + BEM) are documented in
[docs/atomic-design.md](../../docs/atomic-design.md).

## Testing

`pnpm test` from the repo root runs this module's tests alongside `feed`/`rag`/`agent`'s, under
`jsdom` (see `vitest.config.ts`'s `app` project). No test needs the Worker running or any credential.
