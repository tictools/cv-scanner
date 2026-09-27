const LETTER_SPACED_RUN = /\b[A-Za-z]\b(?: \b[A-Za-z]\b){2,}/g;

export const normalizeText = (text: string): string => {
  const rejoined = text.replace(LETTER_SPACED_RUN, (run) => run.replace(/ /g, ""));

  return rejoined.replace(/\s+/g, " ").trim();
};
