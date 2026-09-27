export type ClassValue = string | false | null | undefined | Record<string, boolean> | ClassValue[];

const toTokens = (value: ClassValue): string[] => {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return value.split(" ").filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap(toTokens);
  }

  return Object.entries(value)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
};

export const classNames = (...values: ClassValue[]): string => values.flatMap(toTokens).join(" ");
