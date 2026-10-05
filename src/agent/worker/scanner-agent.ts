import { AIChatAgent } from "@cloudflare/ai-chat";
import { createLlmClient } from "../clients/llm-client";
import { requireOpenAiApiKey, requireUpstashCredentials } from "../env/agent-env";
import { streamTurn } from "../turn/stream-turn";
import type { Env } from "../types/env";

export class ScannerAgent extends AIChatAgent<Env> {
  async onChatMessage() {
    const model = createLlmClient({ apiKey: requireOpenAiApiKey(this.env) });

    const result = await streamTurn({
      model,
      messages: this.messages,
      resolveCredentials: () => requireUpstashCredentials(this.env),
    });

    return result.toUIMessageStreamResponse();
  }
}
