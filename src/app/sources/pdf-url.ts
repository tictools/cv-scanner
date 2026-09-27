const DATA_PREFIX = "data/";

export const pdfUrl = (source: string): string =>
  source.startsWith(DATA_PREFIX) ? `/${source.slice(DATA_PREFIX.length)}` : source;
