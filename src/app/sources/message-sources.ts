import { extractScanCVSources } from "@agent/extraction/scan-cv-sources";
import type { SourceReference } from "@agent/types/sources";
import type { ToolResultInput } from "@agent/types/tools";
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

  return extractScanCVSources(toolResults);
};
