import { describe, expect, it } from "vitest";
import { cvContentSchema, cvSchema } from "./schema";
import type { Cv, CvContent } from "./types";

const validContent: CvContent = {
  summary: "Backend engineer with 6 years of experience building APIs.",
  experience: [
    {
      title: "Backend Engineer",
      company: "Acme Corp",
      startDate: "2021-03",
      endDate: null,
      description: "Owns the payments API used by 2M customers.",
    },
    {
      title: "Junior Developer",
      company: "Globex",
      startDate: "2019-06",
      endDate: "2021-02",
      description: "Maintained internal tooling.",
    },
  ],
  education: [
    {
      degree: "BSc Computer Science",
      institution: "University of Barcelona",
      year: "2019",
    },
  ],
  skills: ["TypeScript", "Node.js", "PostgreSQL"],
};

const validCv: Cv = {
  name: "Jane Doe",
  contact: {
    email: "jane.doe@example.com",
    phone: "+34 600 123 456",
    location: "Barcelona, Spain",
  },
  photoPath: "data/photos/jane-doe.png",
  ...validContent,
};

describe("cvContentSchema", () => {
  it("accepts valid LLM narrative content", () => {
    const result = cvContentSchema.safeParse(validContent);

    expect(result.success).toBe(true);
  });

  it("rejects content with a missing section", () => {
    const { summary: _omitted, ...withoutSummary } = validContent;

    expect(cvContentSchema.safeParse(withoutSummary).success).toBe(false);
  });

  it("rejects content with an empty skills list", () => {
    expect(cvContentSchema.safeParse({ ...validContent, skills: [] }).success).toBe(false);
  });

  it("rejects an experience entry with an empty title", () => {
    const experience = [{ ...validContent.experience[0]!, title: "" }];

    expect(cvContentSchema.safeParse({ ...validContent, experience }).success).toBe(false);
  });

  it("rejects an empty experience list", () => {
    expect(cvContentSchema.safeParse({ ...validContent, experience: [] }).success).toBe(false);
  });
});

describe("cvSchema", () => {
  it("accepts a valid Cv", () => {
    const result = cvSchema.safeParse(validCv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validCv);
    }
  });

  it("rejects a Cv with a missing name", () => {
    const { name: _omitted, ...withoutName } = validCv;

    expect(cvSchema.safeParse(withoutName).success).toBe(false);
  });

  it("rejects a Cv with an invalid email", () => {
    const contact = { ...validCv.contact, email: "not-an-email" };

    expect(cvSchema.safeParse({ ...validCv, contact }).success).toBe(false);
  });

  it("rejects a Cv with a missing photoPath", () => {
    const { photoPath: _omitted, ...withoutPhoto } = validCv;

    expect(cvSchema.safeParse(withoutPhoto).success).toBe(false);
  });

  it("rejects a Cv with an empty summary", () => {
    expect(cvSchema.safeParse({ ...validCv, summary: "" }).success).toBe(false);
  });

  it("rejects an education entry with an empty institution", () => {
    const education = [{ ...validCv.education[0]!, institution: "" }];

    expect(cvSchema.safeParse({ ...validCv, education }).success).toBe(false);
  });
});
