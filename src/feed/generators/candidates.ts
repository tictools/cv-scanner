import { faker } from "@faker-js/faker";
import type { Candidate, Seniority } from "../cv/types";
import { slugify } from "../naming/slug";

export const CANDIDATE_COUNT = 25;
const DEFAULT_SEED = 42;

const ROLES = [
  "Backend Engineer",
  "Frontend Engineer",
  "Full-stack Developer",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "QA Engineer",
  "Product Manager",
  "UX Designer",
  "Mobile Developer",
  "Security Engineer",
  "Data Engineer",
] as const;

const SECTORS = [
  "Fintech",
  "Healthcare",
  "E-commerce",
  "Education",
  "Logistics",
  "Media",
  "Energy",
  "Gaming",
] as const;

const LANGUAGES = ["English", "Spanish", "Catalan"] as const;

const SENIORITIES: readonly Seniority[] = ["junior", "mid", "senior", "lead"];

const GENDERS = ["female", "male"] as const;

const ETHNICITIES = [
  "Western European",
  "Southern European",
  "East Asian",
  "South Asian",
  "Latin American",
  "Middle Eastern",
  "Sub-Saharan African",
  "Nordic",
] as const;

/** Exported: candidates.test.ts asserts against it to avoid duplicating the ranges. */
export const YEARS_BY_SENIORITY: Record<Seniority, [number, number]> = {
  junior: [0, 2],
  mid: [3, 5],
  senior: [6, 12],
  lead: [10, 20],
};

const AGE_RANGES_BY_SENIORITY: Record<Seniority, readonly string[]> = {
  junior: ["22-26", "24-29"],
  mid: ["27-33", "30-36"],
  senior: ["33-40", "37-44"],
  lead: ["40-47", "44-52"],
};

/** Rotates through `list` with a stride coprime to its length, to decorrelate fields. */
const pick = <T>({
  list,
  index,
  stride,
}: {
  list: readonly T[];
  index: number;
  stride: number;
}): T => {
  return list[(index * stride) % list.length]!;
};

/**
 * Builds the 25-candidate set. Role, sector, language, seniority and appearance
 * rotate deliberately through predefined lists (guaranteed diversity); names and
 * contact details come from seeded faker (reproducible given the same seed).
 */
export const generateCandidates = (
  seed: number = DEFAULT_SEED,
): Candidate[] => {
  faker.seed(seed);
  const usedIds = new Map<string, number>();

  return Array.from({ length: CANDIDATE_COUNT }, (_, i) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const seniority = pick({ list: SENIORITIES, index: i, stride: 3 });

    const baseId = slugify(`${firstName} ${lastName}`);
    const seen = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, seen + 1);
    const id = seen === 0 ? baseId : `${baseId}-${seen + 1}`;

    const [minYears, maxYears] = YEARS_BY_SENIORITY[seniority];

    return {
      id,
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number(),
      location: `${faker.location.city()}, ${faker.location.country()}`,
      role: pick({ list: ROLES, index: i, stride: 1 }),
      seniority,
      sector: pick({ list: SECTORS, index: 5 * i + 2, stride: 1 }),
      language: pick({ list: LANGUAGES, index: 2 * i, stride: 1 }),
      yearsOfExperience: faker.number.int({ min: minYears, max: maxYears }),
      appearance: {
        ageRange: pick({
          list: AGE_RANGES_BY_SENIORITY[seniority],
          index: i,
          stride: 1,
        }),
        gender: pick({ list: GENDERS, index: i, stride: 1 }),
        ethnicity: pick({ list: ETHNICITIES, index: 3 * i + 1, stride: 1 }),
      },
    };
  });
};
