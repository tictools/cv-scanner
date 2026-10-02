import type { Cv } from "../cv/types";
import type { NonEmptyArray } from "@shared/ts/typeUtils/aliases";
import { renderClassic } from "./classic";
import { renderModern } from "./modern";

export const TEMPLATES = ["modern", "classic"] as const satisfies Readonly<NonEmptyArray<string>>;
export type TemplateName = (typeof TEMPLATES)[number];

type TemplateRenderer = (params: { cv: Cv; photoDataUri: string }) => string;

const RENDERERS: Record<TemplateName, TemplateRenderer> = {
  modern: renderModern,
  classic: renderClassic,
};

export interface RenderCvHtmlParams {
  cv: Cv;
  template: TemplateName;
  photoDataUri: string;
}

/** Fills an HTML/CSS template with the Cv content. The LLM never touches layout. */
export const renderCvHtml = ({
  cv,
  template,
  photoDataUri,
}: RenderCvHtmlParams): string => {
  const render = RENDERERS[template];

  if (!render) {
    throw new Error(`Unknown CV template: ${String(template)}`);
  }

  return render({ cv, photoDataUri });
};
