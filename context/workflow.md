# Workflow

Four modules, all local. `feed` writes CVs once, `rag` indexes them once, and each question goes
`app` → `agent` → `rag` → Upstash, with OpenAI writing the answer from what the search returned.

```mermaid
flowchart LR
    subgraph once [Once]
        Gemini[Gemini] --> Feed[feed]
        Feed --> Data["data/\nPDF, photo, manifest"]
        Data --> Ingest["rag ingest"]
        Ingest --> Upstash[Upstash Vector]
    end

    subgraph ask [Each question]
        User[User] --> App[app]
        App -->|WebSocket| Agent[agent]
        Agent -->|scan-cv| Retrieve[rag retrieve]
        Retrieve --> Upstash
        Agent -->|prompt + tool result| OpenAI[OpenAI]
        OpenAI -->|tool call or answer| Agent
        Agent -->|stream + tool parts| App
        App -->|PDF link| Data
    end
```

| Command | What runs |
| --- | --- |
| `pnpm generate:cvs` | `feed` calls Gemini, writes `data/` |
| `pnpm ingest:cvs` | `rag` reads `data/`, rebuilds the Upstash index |
| `pnpm dev:agent` | Worker on `:8787` |
| `pnpm dev:app` | Vite on `:5173`, proxies `/agents` to the Worker |

`rag` never answers. `agent` never embeds. `app` never searches. The only shared code across a
boundary is `extractScanCVSources` (`@agent/extraction/scan-cv-sources`): server and UI both derive
cited CVs from `scan-cv` results, never from the model's sentences.

## Generation

`feed` invents 25 candidates from a seeded faker (name, role, contact stay stable across re-runs).
Gemini writes the narrative and the portrait. Layout is an HTML template, not model output.

```mermaid
flowchart TD
    Seed["seeded candidate\nname, role, contact"] --> Text
    Seed --> Photo
    Text["Gemini narrative\nZod-checked, cached"] --> Html
    Photo["Gemini portrait\ncached"] --> Html
    Html["HTML template\nmodern or classic"] --> Pdf["Puppeteer\ndata/cvs/id.pdf"]
    Pdf --> Manifest[data/manifest.json]
```

A schema-invalid narrative is retried and never written. Text and photos are cached under
`data/content/` and `data/photos/`, so a re-run skips Gemini.

## Ingestion

One vector per CV. These résumés are a few hundred words; splitting them would separate the name
from the role. Upstash embeds the text (`openai/text-embedding-3-small`). `rag` sends plain text.

```mermaid
flowchart LR
    Manifest[manifest.json] --> Pdf[PDF]
    Pdf --> Extract[extract text]
    Extract --> Norm["rejoin letter-spaced headings\nP R O F I L E → PROFILE"]
    Norm --> Upsert["upsert\nid = candidateId"]
    Upsert --> Upstash[Upstash Vector]
```

`pnpm ingest:cvs` wipes the index and rebuilds it. One unreadable PDF is recorded as failed; the
rest still index.

## A question

The model does not receive the corpus up front. It calls `scan-cv`, which is `retrieve(query, { topK })`.
The streamed answer may only use that text. The source panel is `extractScanCVSources` over the same
tool parts.

```mermaid
sequenceDiagram
    participant User
    participant App as app :5173
    participant Agent as agent :8787
    participant Model as OpenAI
    participant Rag as rag retrieve
    participant Store as Upstash Vector

    User->>App: question
    App->>Agent: WebSocket /agents
    Agent->>Model: stream, tool scan-cv
    Model-->>Agent: scan-cv query
    Agent->>Rag: retrieve
    Rag->>Store: query text
    Store-->>Rag: closest CVs
    Rag-->>Agent: candidateId, source, content, score
    Agent->>Model: tool result
    Model-->>Agent: grounded answer
    Agent-->>App: stream plus tool parts
    App->>App: extractScanCVSources
    App-->>User: answer and source panel
    User->>App: open a name
    App-->>User: /cvs/id.pdf
```

Portraits come from `/photos/{candidateId}.png`. Both URLs are `data/` served by Vite's `publicDir`.
