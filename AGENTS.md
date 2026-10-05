# AGENTS.md

This file is the **canonical source of rules and context** for this repository. Any AI agent
(or human) working on this codebase should read it first.

> **Living document**: this file evolves throughout the module's lifecycle. Whenever a new
> module gets a design decision or a doc under `docs/`, update the sections below (especially
> the Documentation Map) instead of letting knowledge live only in chat/plan sessions. Whenever a
> new agent skill is added to the repo, register it in the Skills Registry instead.

## 1. Project Overview

`cv-scanner` is an AI-powered CV screener built for the technical task described in
[CHALLENGE.md](CHALLENGE.md). It is a chat application that lets a user ask questions about a
collection of fake CVs (résumés), structured as four modules under `src/`:

1. **`feed`** — generates 25-30 realistic fake CVs in PDF format (AI-generated photo, contact
   info, experience, skills, education) into `data/`.
2. **`rag`** — ingestion + retrieval: extracts text from the PDFs, chunks it, and makes it
   retrievable (embeddings/vector search).
3. **`agent`** — orchestration: takes the user's question and `rag`'s retrieved chunks, calls
   the LLM to produce a grounded answer, and assembles source references.
4. **`app`** — frontend chat UI: input + answer display, optionally citing which CVs were used
   as sources.

See [docs/architecture.md](docs/architecture.md) for the full system design (data flow, module
boundaries, open questions).

Alongside the four modules, `src/shared/` holds runtime-agnostic code more than one module needs
(currently environment-variable access, `src/shared/env/`, imported via `@shared/*`). It is not a
module and the only place the generic name `shared` is allowed — see
[docs/architecture.md §2.1](docs/architecture.md).

Current status: all four `src/` modules are implemented — `feed` (CV generation pipeline), `rag`
(ingestion + retrieval), `agent` (orchestration — a Cloudflare Worker + Durable Object, `pnpm
dev:agent`), and `app` (frontend chat UI — a Vite + React 19 SPA, `pnpm dev:app`).

## 2. Getting Started

- **Requirements**: Node.js, [pnpm](https://pnpm.io/) — the version is pinned via
  `packageManager`/`devEngines` in `package.json` (`pnpm@12.6.0`).
- **Install dependencies**: `pnpm install`
- **Environment variables**: copy the required keys into a local `.env` file (gitignored, never
  commit it). `.env` is the **single** environment file for every runtime in this repo, including
  the `agent` Worker — Wrangler reads `.env` natively, so there is no second `.dev.vars` file and
  none should be added. Currently required:
  - `GEMINI_API_KEY` — Google AI Studio key, used for both text and image generation in the
    `feed` module.
  - `UPSTASH_VECTOR_REST_URL` / `UPSTASH_VECTOR_REST_TOKEN` — `rag`'s runtime credentials for its
    Upstash Vector index (created with the `openai/text-embedding-3-small` embedding model), read
    from `process.env` by Node scripts/tests and from the Worker's `env` binding by `agent`.
  - `OPENAI_API_KEY` — **two roles**: a one-time **console-setup** credential pasted into the
    Upstash console when creating/recreating the index (authorizes Upstash's own call to OpenAI,
    stored server-side there — no `rag` code reads this variable for that purpose), and, separately,
    a **runtime credential** the `agent` Worker reads via its `env` binding
    (`env/agent-env.ts`'s `requireOpenAiApiKey`) to call the OpenAI API directly for answer
    generation. Both roles read the same `.env` value.
- **Run**: `pnpm generate:cvs` runs the `feed` module's CV generation pipeline (requires
  `GEMINI_API_KEY`); `pnpm ingest:cvs` runs the `rag` module's ingestion pipeline — extracts every
  CV PDF's text and indexes one vector per candidate into Upstash Vector (requires
  `UPSTASH_VECTOR_REST_URL`/`UPSTASH_VECTOR_REST_TOKEN` and a populated `data/` from
  `generate:cvs`); `pnpm dev:agent` runs the `agent` module's Cloudflare Worker locally via
  `wrangler dev` (requires `OPENAI_API_KEY` and both `UPSTASH_VECTOR_REST_*` variables — every agent
  test passes without them, since the model is injected as a parameter and mocked); `pnpm dev:app` runs
  the `app` module's Vite dev server at `http://localhost:5173`, proxying `/agents` (including the
  WebSocket upgrade) to the Worker at `http://localhost:8787` — **`pnpm dev:agent` and `pnpm dev:app`
  must both be running** for the chat UI to work, and `data/` must be populated (`generate:cvs` +
  `ingest:cvs`) or a cited CV's PDF link 404s; `pnpm lint` runs
  ESLint; `pnpm test` runs the unit suite (Vitest) — one integration test in `rag`
  (`src/rag/retrieval/ground-truth.test.ts`) exercises the live Upstash index and skips itself when
  the two Upstash variables are absent; `app`'s tests run under `jsdom` via a second Vitest project
  and need neither the Worker nor any credential.

## 3. Tech Stack

- **Runtime**: Node.js + TypeScript, ESM (`"type": "module"` in `package.json`).
- **Package manager**: pnpm, pinned to `12.6.0`.
- **Dependency versions**: always pinned exactly — no `^`/`~` ranges in `package.json`.
  Enforced by `save-exact=true` in `.npmrc`, so `pnpm add <pkg>` writes the exact version by
  default; if a range slips in via manual editing, pin the resolved version before committing.
- **LLM provider**: Gemini (Google AI Studio, free tier) — single provider for both text and
  image generation, to minimize integration friction. Any provider swap should stay isolated
  behind a thin client wrapper.
- **Test runner**: Vitest (`pnpm test`) — chosen when implementing `feed`, first module to reach
  this decision point (see `docs/tdd.md`); `tsx` runs TS ESM with resolved path aliases for the
  `generate:cvs` script.
- **Linting**: ESLint (`pnpm lint`), flat config in `eslint.config.js` — `@eslint/js` recommended
  rules plus `typescript-eslint` recommended rules. `@typescript-eslint/no-unused-vars` sets
  `ignoreRestSiblings: true` to allow the repo's destructure-to-omit-a-key test pattern (e.g.
  `const { summary: _omitted, ...rest } = value`) without disabling the rule elsewhere.
- **CI**: GitHub Actions, [.github/workflows/ci.yml](.github/workflows/ci.yml) — runs `pnpm lint`
  and `pnpm test` on every push to `main` and on every pull request.
- **CV generation** (installed, used by `feed`): `zod` (schema validation), `@faker-js/faker`
  (deterministic metadata), `puppeteer` (HTML → PDF rendering), `p-limit` (LLM call
  concurrency), `@google/generative-ai` (Gemini SDK), `dotenv`.
- **RAG pipeline** (installed, used by `rag`): `unpdf` (PDF text extraction, ESM-first wrapper
  over `pdfjs-dist`), `@upstash/vector` (vector store client, the only file importing it is
  `src/rag/store/vector-index.ts`).
- **Frontend** (implemented, used by `app`): Vite + React 19 SPA (`vite@8.3.1`,
  `@vitejs/plugin-react@6.1.1`, `react@19.3.0`/`react-dom@19.3.0`, dev server with zero-config HMR),
  talking to `agent`'s Worker through `@ai-sdk/react@4.0.119` (the peer dep `@cloudflare/ai-chat`'s
  chat transport is built on) via `agents/react`'s `useAgent` + `@cloudflare/ai-chat/react`'s
  `useAgentChat` — no hand-rolled WebSocket/SSE code. Tests run under `jsdom@30.1.1` with
  `@testing-library/react@16.3.3`/`@testing-library/user-event@14.6.7`, as a second Vitest project.
  CSS Modules + BEM for component styling; React Context API for state management (no
  Redux/Zustand); Atomic Design hierarchy (atoms → molecules → organisms → pages) — see
  `docs/atomic-design.md`.
- **Agent** (installed, used by `agent`): OpenAI as the LLM provider, via the AI SDK
  (`ai@7.0.118`, `@ai-sdk/openai@4.0.78`, tools registered with `tool()`), on Cloudflare Workers +
  Durable Objects (`agents@0.24.0`, `@cloudflare/ai-chat@0.12.0`, dev deps `wrangler@4.141.0` and
  `@cloudflare/workers-types@5.20260927.1`). `clients/llm-client.ts` is the only file importing
  `@ai-sdk/openai`; `worker/scanner-agent.ts` is the only file importing `@cloudflare/ai-chat`. Model:
  `gpt-5.4-mini-2026-03-17` (the dated snapshot, not the floating alias). Design in
  `openspec/changes/archive/2026-09-27-add-agent/design.md`; how it connects to the other modules is in `context/workflow.md`.

## 4. Documentation Map

Maps concrete tasks/cases to the canonical doc to read before working on them. If you're about
to touch a module and there's a row for it, **read the doc first**. If a module doesn't have a
doc yet, write one under `docs/` as part of the task and add a row here.

| Task / Case                                                                                    | Read                                         | Status                                                             |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Understand/change overall system shape, module boundaries, or cross-cutting decisions          | [docs/architecture.md](docs/architecture.md) | Living — iterates with the module lifecycle                        |
| Implement any module behavior under `src/` (writing or changing code, not just config/tooling) | [docs/tdd.md](docs/tdd.md)                   | Mandatory — red-green-refactor per task; runner is Vitest |
| Design/build UI components following atomic design principles                                  | [docs/atomic-design.md](docs/atomic-design.md) | Living — hierarchical component organization (atoms → molecules → organisms → pages); CSS Modules + BEM; **no raw JSX outside atoms**; render-only branches use `RenderOrNull`/`RenderOrFallback` under their evaluation contract (§4.6) |
| Implement or change `feed` (CV generation) module behavior | [openspec/changes/add-cv-generation/design.md](openspec/changes/add-cv-generation/design.md) and [.../specs/feed-cv-generation/spec.md](openspec/changes/add-cv-generation/specs/feed-cv-generation/spec.md) | Implemented — path moves to `openspec/specs/` once the change is archived |
| Implement or change `rag` (ingestion + retrieval) module behavior | [openspec/changes/add-rag-retrieval/design.md](openspec/changes/add-rag-retrieval/design.md) and [.../specs/rag-ingestion/spec.md](openspec/changes/add-rag-retrieval/specs/rag-ingestion/spec.md) / [.../specs/rag-retrieval/spec.md](openspec/changes/add-rag-retrieval/specs/rag-retrieval/spec.md) | Implemented — path moves to `openspec/specs/` once the change is archived |
| Implement or change `agent` (orchestration) module behavior | [openspec/changes/archive/2026-09-27-add-agent/design.md](openspec/changes/archive/2026-09-27-add-agent/design.md) and [.../specs/agent-orchestration/spec.md](openspec/specs/agent-orchestration/spec.md) / [.../specs/agent-tools/spec.md](openspec/specs/agent-tools/spec.md) / [.../specs/agent-sources/spec.md](openspec/specs/agent-sources/spec.md) | Archived — Cloudflare Worker + Durable Object (`pnpm dev:agent`), OpenAI via the AI SDK, `scan-cv` retrieval tool. Layout: `turn/` (turn runner), `worker/` (Cloudflare adapter), `extraction/`, `tools/`, `clients/`, `env/`, `types/` (catalog of every exported type) |
| Implement or change `app` (frontend UI) module behavior | [openspec/changes/archive/2026-09-27-add-app/design.md](openspec/changes/archive/2026-09-27-add-app/design.md) and [.../specs/app-chat/spec.md](openspec/specs/app-chat/spec.md) / [.../specs/app-sources/spec.md](openspec/specs/app-sources/spec.md) | Archived — Vite + React 19 SPA (`pnpm dev:app`), Atomic Design, `useScannerChat` wrapping `useAgent`/`useAgentChat` against the agent Worker (proxied via `vite.config.ts`), sources derived from `scan-cv`'s tool parts via a narrow `@agent/extraction/scan-cv-sources` import plus type-only `@agent/types/*` imports |
| Add or change code under `src/shared/`, or read/validate an environment variable in any module | [docs/architecture.md §2.1](docs/architecture.md) | Decided — cross-module, runtime-agnostic code only; use `@shared/env/require-env-var` instead of hand-rolling env validation |
| See how the four modules communicate (onboarding, the workflow diagram) | [context/workflow.md](context/workflow.md) | Living — one diagram-first page. Update it when the wiring changes. File-level behavior stays in that module's OpenSpec design |
| Write or edit any code file, in any module | [docs/code-conventions.md](docs/code-conventions.md) | Mandatory — in-file layout, and directory layout (no loose files; no `utils`/`helpers`) |

## 5. Skills Registry

Kept **separate from the Documentation Map above** on purpose: docs are read manually before
starting a task, while skills are invoked automatically by the agent when a task matches their
description — mixing the two made it unclear which entries required action and which just fired
on their own. Whenever a new skill is added to the repo (see the canonical-copy convention in
Working Agreements below), register it here.

| Skill                          | Triggers on                                                                                    | Source                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `autoimprove`                    | A correction, mistake, or improvement surfaces that should update a skill, a `docs/` page, or this file | [.agents/skills/autoimprove/SKILL.md](.agents/skills/autoimprove/SKILL.md)               |
| `openspec-explore`               | Thinking through an idea or problem before/during a change                                       | `.claude/skills/openspec-explore/` (OpenCode reads this path directly too)                 |
| `openspec-propose`               | Describing what to build and generating a full change proposal in one step                       | `.claude/skills/openspec-propose/` (OpenCode reads this path directly too)                 |
| `openspec-apply-change`          | Implementing or continuing tasks from an OpenSpec change                                          | `.claude/skills/openspec-apply-change/` (OpenCode reads this path directly too)            |
| `openspec-sync-specs`            | Syncing delta specs from a change into main specs, without archiving                              | `.claude/skills/openspec-sync-specs/` (OpenCode reads this path directly too)              |
| `openspec-archive-change`        | Finalizing and archiving a change once implementation is complete                                 | `.claude/skills/openspec-archive-change/` (OpenCode reads this path directly too)          |
| `vercel-react-best-practices`     | Writing, reviewing, or refactoring React/Next.js code for performance patterns                    | [.agents/skills/vercel-react-best-practices/SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md) |
| `vercel-composition-patterns`     | Refactoring components with boolean-prop proliferation, or designing flexible/reusable component APIs | [.agents/skills/vercel-composition-patterns/SKILL.md](.agents/skills/vercel-composition-patterns/SKILL.md) |
| `web-design-guidelines`          | Reviewing UI code for accessibility, design, or UX best-practice compliance                        | [.agents/skills/web-design-guidelines/SKILL.md](.agents/skills/web-design-guidelines/SKILL.md) |
| `git-workflow`                    | Creating a new branch, opening a PR, or handling a `git push` that's out of sync/conflicting        | [.agents/skills/git-workflow/SKILL.md](.agents/skills/git-workflow/SKILL.md)               |
|                                  |                                                                                                    |                                                                                             |

## 6. Working Agreements

- Planning/session-scratch notes live under `plans/` (gitignored, never committed). Once a plan
  becomes an actual design decision for a module, promote the relevant content into a doc under
  `docs/` and reference it from the table above — `plans/` is not a substitute for `docs/`.
- `CLAUDE.md` only imports this file (`@AGENTS.md`); it does not duplicate rules. Add new
  canonical rules here, not there.
- **Whenever feasible, work follows the [OpenSpec](https://github.com/Fission-AI/openspec)
  spec-driven workflow**: capture the change as a spec/proposal before implementing, keep specs
  under version control, and let the implementation be derived from (and stay traceable to) the
  spec rather than the other way around. If a task doesn't fit that workflow (trivial fix,
  exploratory spike, tooling/config change), it's fine to skip it — but default to OpenSpec for
  anything that changes module behavior or introduces a new one.
- **New agent skills default to one canonical copy**: put the real `SKILL.md` under
  `.agents/skills/<name>/`, then symlink it from `.claude/skills/<name>`. Both Claude Code and
  OpenCode read `.agents/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md` directly, so this
  single file already works for both — no separate `.opencode/skills/` copy is needed (removed a
  redundant one that predated this rule). Only keep independent, non-symlinked copies per tool
  when the content must actually differ per tool, e.g. tool-specific slash-command syntax — that's
  why OpenCode still has its own `openspec-*` **commands** under `.opencode/commands/` (see below).
  Register the new skill in the Skills Registry (§5) once it's added.
- **`.opencode/` only tracks `commands/`** (OpenCode's own slash-command files, one per `openspec-*`
  workflow — the equivalent of `.claude/commands/opsx/*.md`, kept separate because neither tool
  reads the other's commands directory) plus its own `.gitignore`. If `.opencode/package.json`,
  `package-lock.json`, or `node_modules` reappear, that's OpenCode auto-generating its own plugin
  scaffolding on startup regardless of whether this repo defines a plugin (a known upstream quirk,
  not something to fix here) — they're already covered by `.opencode/.gitignore` and safe to
  delete again if they get in the way locally.
- **`.claude/commands/opsx/*.md` were removed** (2026-09-26): on Claude Code, the `openspec-*`
  skills already cover the same workflows and Claude Code can invoke a skill directly as a slash
  command (`/skill-name`, from its frontmatter `name` or directory) — the separate `/opsx:*`
  command namespace was judged not worth keeping just for that one alias. Known side effect,
  accepted deliberately rather than fixed: the `openspec-*` skills' own prose still tells users to
  run `/opsx:apply`, `/opsx:explore`, etc. in a few places — those are now dead references on the
  Claude Code side (they still work on OpenCode, which keeps its own `/opsx-*` commands under
  `.opencode/commands/`). Use `/openspec-apply-change`, `/openspec-explore`, etc. (or just describe
  the task — the skills auto-trigger) instead. Don't "fix" this by editing the skills' prose
  in-place — that content is vendored (see `skills-lock.json`) and would drift from upstream;
  re-evaluate if/when the skills get re-synced.
