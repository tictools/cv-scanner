import { describe, expect, it } from "vitest";
import { CANDIDATE_COUNT, generateCandidates, YEARS_BY_SENIORITY } from "./candidates";

const SEED = 42;
const MIN_DISTINCT_ROLES = 3;
const MIN_DISTINCT_VALUES = 2;
const ANOTHER_SEED = 123;
const SEED_A = 1;
const SEED_B = 2;

describe("generateCandidates", () => {
  it(`returns exactly ${CANDIDATE_COUNT} candidates`, () => {
    expect(generateCandidates(SEED)).toHaveLength(CANDIDATE_COUNT);
  });

  it("gives every candidate a unique id", () => {
    const ids = generateCandidates(SEED).map((c) => c.id);

    expect(new Set(ids).size).toBe(CANDIDATE_COUNT);
  });

  it("spans at least 3 distinct roles, 2 languages and mixed seniority levels", () => {
    const candidates = generateCandidates(SEED);

    expect(new Set(candidates.map((c) => c.role)).size).toBeGreaterThanOrEqual(
      MIN_DISTINCT_ROLES,
    );
    expect(
      new Set(candidates.map((c) => c.language)).size,
    ).toBeGreaterThanOrEqual(MIN_DISTINCT_VALUES);
    expect(
      new Set(candidates.map((c) => c.seniority)).size,
    ).toBeGreaterThanOrEqual(MIN_DISTINCT_VALUES);
  });

  it("varies appearance attributes used by the photo prompt", () => {
    const candidates = generateCandidates(SEED);

    expect(
      new Set(candidates.map((c) => c.appearance.gender)).size,
    ).toBeGreaterThanOrEqual(MIN_DISTINCT_VALUES);
    expect(
      new Set(candidates.map((c) => c.appearance.ethnicity)).size,
    ).toBeGreaterThanOrEqual(MIN_DISTINCT_VALUES);
    expect(
      new Set(candidates.map((c) => c.appearance.ageRange)).size,
    ).toBeGreaterThanOrEqual(MIN_DISTINCT_VALUES);
  });

  it("produces identical metadata for the same seed", () => {
    expect(generateCandidates(ANOTHER_SEED)).toEqual(generateCandidates(ANOTHER_SEED));
  });

  it("produces different names for different seeds", () => {
    const names = (seed: number) =>
      generateCandidates(seed).map((c) => `${c.firstName} ${c.lastName}`);

    expect(names(SEED_A)).not.toEqual(names(SEED_B));
  });

  it("derives years of experience consistent with seniority", () => {
    for (const c of generateCandidates(SEED)) {
      const [min, max] = YEARS_BY_SENIORITY[c.seniority];
      expect(c.yearsOfExperience).toBeGreaterThanOrEqual(min);
      expect(c.yearsOfExperience).toBeLessThanOrEqual(max);
    }
  });
});
