import { convertToModelMessages, stepCountIs } from "ai";
import { createTools } from "../tools";
import type { TurnOptions } from "../types/turn";
import { compact } from "./compaction";
import { SYSTEM_PROMPT } from "./system-prompt";

export const DEFAULT_MAX_STEPS = 4;

export const buildTurnConfig = async ({ messages, maxSteps, resolveCredentials }: TurnOptions) => ({
  system: SYSTEM_PROMPT,
  messages: await convertToModelMessages(compact(messages)),
  tools: createTools({ resolveCredentials }),
  stopWhen: stepCountIs(maxSteps ?? DEFAULT_MAX_STEPS),
});
