import type { SourceReference } from "@agent/types/sources";
import type { UIMessage } from "ai";
import type { Maybe, NonEmptyArray } from "@shared/ts/typeUtils/aliases";
import { sourcesFromMessage } from "./message-sources";

export const latestAnsweredSources = (
  messages: UIMessage[],
): Maybe<NonEmptyArray<SourceReference>> => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const sources = sourcesFromMessage(messages[index]!);

    if (sources.length > 0) {
      return sources as NonEmptyArray<SourceReference>;
    }
  }

  return undefined;
};
