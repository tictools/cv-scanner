# cv-scanner

AI-powered CV screener: a RAG pipeline and chat interface for querying a collection of
generated CVs.

This project generates a dataset of fake CVs, indexes them in a Retrieval-Augmented Generation
(RAG) pipeline, and exposes a chat interface to ask questions about the candidates based solely
on their CV content.

See [CHALLENGE.md](CHALLENGE.md) for the full technical task this project implements.

## Stack

- **Runtime**: Node.js 22, TypeScript (ESM)
- **Package manager**: [pnpm](https://pnpm.io/) `12.6.0` (pinned in `package.json`)
- **Frontend** (`app`): Vite + React 19 — `pnpm dev:app`
- **Backend** (`agent`): Cloudflare Worker + Durable Object, local via Wrangler — `pnpm dev:agent`
- **CV generation** (`feed`): Gemini (text and images), Puppeteer (PDF)
- **Retrieval** (`rag`): Upstash Vector (`openai/text-embedding-3-small`), embeddings hosted by Upstash
- **Answers**: OpenAI via the AI SDK (`gpt-5.4-mini-2026-03-17`)

## Prerequisites

- **Node.js 22** (the version CI uses; see [.github/workflows/ci.yml](.github/workflows/ci.yml))
- **pnpm 12.6.0**. With Corepack (ships with Node):

  ```sh
  corepack enable
  corepack prepare pnpm@12.6.0 --activate
  ```

- Accounts and keys for the services below. Copy [.env.example](.env.example) to `.env` and fill
  every value. `.env` is gitignored and is the **only** env file in this repo — Wrangler reads it
  natively for the Worker. Do not add a `.dev.vars`; it would shadow `.env` for the Worker only.

| Variable | Used by | Where to get it |
| --- | --- | --- |
| `GEMINI_API_KEY` | `pnpm generate:cvs` (`feed`) | [Google AI Studio](https://aistudio.google.com/apikey) |
| `UPSTASH_VECTOR_REST_URL` | `pnpm ingest:cvs` and the Worker | Upstash Vector index → REST URL |
| `UPSTASH_VECTOR_REST_TOKEN` | `pnpm ingest:cvs` and the Worker | Upstash Vector index → REST token |
| `OPENAI_API_KEY` | Upstash index setup **and** the Worker | [OpenAI API keys](https://platform.openai.com/api-keys) |

`OPENAI_API_KEY` has two roles and they share the same `.env` value:

1. **One-time console setup.** When you create the Upstash Vector index, paste this key into the
   Upstash console so Upstash can call OpenAI for embeddings. Upstash stores it server-side. No
   `rag` code reads the variable for that purpose.
2. **Runtime.** The Worker reads it from its `env` binding to call OpenAI for answers.

Create the Upstash index with the embedding model `openai/text-embedding-3-small` (1536
dimensions, cosine). A different model will not match what ingestion and retrieval expect.

The chat UI itself reads no secrets. It only works once the Worker is running and `data/` has
been generated and ingested.

## Install

```sh
pnpm install
cp .env.example .env
# fill GEMINI_API_KEY, UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN, OPENAI_API_KEY
```

## Dataset

`data/` is gitignored. Run the two commands below one after the other, in this order. Wait
until `generate:cvs` exits before starting `ingest:cvs`: ingestion reads `data/manifest.json`
and the PDFs the first command writes, so running them in parallel indexes an empty or partial
dataset.

Both steps are one-shot and safe to re-run. Ingestion resets the Upstash index from whatever
`data/manifest.json` lists at that moment.

```sh
pnpm generate:cvs   # needs GEMINI_API_KEY — writes PDFs, photos, and manifest.json into data/
# wait until the command above finishes
pnpm ingest:cvs     # needs both UPSTASH_VECTOR_REST_* — one vector per candidate
```

`generate:cvs` renders PDFs with Puppeteer, which downloads Chromium on first run. Without a
populated `data/`, the chat still answers from the index, but cited PDF and portrait links 404.

## Run locally

The app and the Worker are two processes. Start both, from the repo root, in separate terminals:

```sh
pnpm dev:agent   # Cloudflare Worker (Wrangler) — http://localhost:8787
pnpm dev:app     # Vite — http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173). That is the chat UI.

[http://localhost:8787](http://localhost:8787) is the Worker, not a page. Opening it in a
browser shows the plain text `Not found` (HTTP 404). The Worker only answers the agent
protocol under `/agents/scanner-agent/<session-id>` — the WebSocket the chat uses, and
`GET /agents/scanner-agent/<session-id>/get-messages` to reload a session. Anything else,
including `/`, falls through to that 404.

Vite proxies `/agents` (including the WebSocket upgrade) to the Worker at
`http://localhost:8787`, so the browser talks to a single origin and you never open 8787
yourself. The Worker needs
`OPENAI_API_KEY` and both `UPSTASH_VECTOR_REST_*` variables in `.env` or it fails when a question
triggers retrieval or answer generation.

Nothing in this flow deploys to Cloudflare. `pnpm dev:agent` runs the Worker locally with Wrangler.

## Checks

`pnpm lint` and `pnpm test` do not need the Worker, the app, or any API key. One retrieval test
(`src/rag/retrieval/ground-truth.test.ts`) hits the live Upstash index and skips itself when the
Upstash variables are absent. A second test skips when `data/cvs/` does not exist.

```sh
pnpm lint
pnpm test
```
