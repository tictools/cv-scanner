import type { LanguageModel, UIMessage } from "ai";
import type { CreateToolsOptions } from "./tools";
import type { RetrievedChunk } from "./chunks";
import type { SourceReference } from "./sources";

export interface TurnOptions {
  model: LanguageModel;
  messages: UIMessage[];
  maxSteps?: number;
  resolveCredentials?: CreateToolsOptions["resolveCredentials"];
}

export interface AgentToolCall {
  toolName: string;
  input: unknown;
}

export interface AgentResult {
  text: string;
  sources: SourceReference[];
  toolCalls: AgentToolCall[];
  retrievedChunks: RetrievedChunk[];
}
