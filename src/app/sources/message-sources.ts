import { extractSources, type SourceReference, type ToolResultInput } from "@agent/extraction/extract-sources";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { Maybe } from "@shared/ts/typeUtils/aliases";

const toToolResult = (part: UIMessage["parts"][number]): Maybe<ToolResultInput> => {
  if (!isToolUIPart(part) || !("output" in part) || part.output === undefined) {
    return undefined;
  }

  return { toolName: getToolName(part), output: part.output };
};

export const sourcesFromMessage = (message: UIMessage): SourceReference[] => {
  const toolResults = message.parts
    .map(toToolResult)
    .filter((result): result is ToolResultInput => result !== undefined);

  return extractSources(toolResults);
};
