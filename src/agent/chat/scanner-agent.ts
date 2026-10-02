import { AIChatAgent } from "@cloudflare/ai-chat";
import { createLlmClient } from "../clients/llm-client";
import { requireOpenAiApiKey, requireUpstashCredentials, type Env } from "../env/agent-env";
import { streamAgent } from "../orchestration/query";

export class ScannerAgent extends AIChatAgent<Env> {
  async onChatMessage() {
    const model = createLlmClient({ apiKey: requireOpenAiApiKey(this.env) });

    const result = await streamAgent({
      model,
      messages: this.messages,
      resolveCredentials: () => requireUpstashCredentials(this.env),
    });

    return result.toUIMessageStreamResponse();
  }
}
