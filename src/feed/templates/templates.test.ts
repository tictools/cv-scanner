import { describe, expect, it } from "vitest";
import type { Cv } from "../cv/types";
import { renderCvHtml, TEMPLATES } from "./index";

const PHOTO_DATA_URI = "data:image/png;base64,ZmFrZS1waG90bw==";

const cv: Cv = {
  name: "Jane Doe",
  contact: {
    email: "jane.doe@example.com",
    phone: "+34 600 123 456",
    location: "Barcelona, Spain",
  },
  photoPath: "data/photos/jane-doe.png",
  summary: "Backend engineer with 8 years in fintech.",
  experience: [
    {
      title: "Backend Engineer",
      company: "Acme Corp",
      startDate: "2021-03",
      endDate: null,
      description: "Owns the payments API.",
    },
    {
      title: "Junior Developer",
      company: "Globex",
      startDate: "2017-06",
      endDate: "2021-02",
      description: "Maintained internal tooling.",
    },
  ],
  education: [{ degree: "BSc Computer Science", institution: "University of Barcelona", year: "2017" }],
  skills: ["TypeScript", "Node.js", "PostgreSQL"],
};

describe.each(TEMPLATES)("template %s", (template) => {
  it("includes every Cv field and the photo reference in the HTML", () => {
    const html = renderCvHtml({ cv, template, photoDataUri: PHOTO_DATA_URI });

    expect(html).toContain("Jane Doe");
    expect(html).toContain("jane.doe@example.com");
    expect(html).toContain("+34 600 123 456");
    expect(html).toContain("Barcelona, Spain");
    expect(html).toContain("Backend engineer with 8 years in fintech.");
    expect(html).toContain("Backend Engineer");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("2021-03");
    expect(html).toContain("Owns the payments API.");
    expect(html).toContain("Junior Developer");
    expect(html).toContain("Globex");
    expect(html).toContain("2021-02");
    expect(html).toContain("BSc Computer Science");
    expect(html).toContain("University of Barcelona");
    expect(html).toContain("2017");
    for (const skill of cv.skills) {
      expect(html).toContain(skill);
    }
    expect(html).toContain(PHOTO_DATA_URI);
  });

  it("renders the current position as present", () => {
    const html = renderCvHtml({ cv, template, photoDataUri: PHOTO_DATA_URI });

    expect(html).toMatch(/present/i);
  });

  it("escapes HTML in Cv content", () => {
    const malicious: Cv = { ...cv, summary: "x <script>alert(1)</script> & \"quotes\"" };

    const html = renderCvHtml({ cv: malicious, template, photoDataUri: PHOTO_DATA_URI });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });
});

it("throws for an unknown template", () => {
  expect(() =>
    renderCvHtml({ cv, template: "gothic" as never, photoDataUri: PHOTO_DATA_URI }),
  ).toThrow(/template/i);
});
