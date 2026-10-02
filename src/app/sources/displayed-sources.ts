import type { SourceReference } from "@agent/extraction/extract-sources";
import type { UIMessage } from "ai";
import type { Maybe, NonEmptyArray } from "@shared/ts/typeUtils/aliases";
import type { ScannerChatState } from "../hooks/useScannerChat";
import { latestAnsweredSources } from "./latest-answered-sources";

export interface DisplayedSourcesOptions {
  messages: UIMessage[];
  state: ScannerChatState;
}

const lastUserMessageIndex = (messages: UIMessage[]): number => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]!.role === "user") {
      return index;
    }
  }

  return -1;
};

const dropInFlightTurn = (messages: UIMessage[]): UIMessage[] =>
  messages.slice(0, lastUserMessageIndex(messages) + 1);

/**
 * `latestAnsweredSources`, but while `state` is `"streaming"` the turn in
 * flight (everything after the last user message) is excluded, so the panel
 * keeps showing the previous answered turn's sources until the new one
 * finishes streaming.
 */
export const displayedSources = ({
  messages,
  state,
}: DisplayedSourcesOptions): Maybe<NonEmptyArray<SourceReference>> => {
  const consideredMessages = state === "streaming" ? dropInFlightTurn(messages) : messages;

  return latestAnsweredSources(consideredMessages);
};
