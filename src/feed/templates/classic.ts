import type { Cv } from "../cv/types";
import { escapeHtml } from "./escape";

export const renderClassic = ({ cv, photoDataUri }: { cv: Cv; photoDataUri: string }): string => {
  const e = escapeHtml;
  const experience = cv.experience
    .map(
      (job) => `
      <section class="entry">
        <div class="entry-head">
          <span class="title">${e(job.title)}, ${e(job.company)}</span>
          <span class="dates">${e(job.startDate)} — ${job.endDate ? e(job.endDate) : "Present"}</span>
        </div>
        <p>${e(job.description)}</p>
      </section>`,
    )
    .join("");
  const education = cv.education
    .map(
      (ed) => `
      <section class="entry">
        <div class="entry-head">
          <span class="title">${e(ed.degree)}, ${e(ed.institution)}</span>
          <span class="dates">${e(ed.year)}</span>
        </div>
      </section>`,
    )
    .join("");
  const skills = cv.skills.map((skill) => e(skill)).join(" · ");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 11.5px; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 36px 40px; }
  header { text-align: center; border-bottom: 1px solid #999; padding-bottom: 16px; margin-bottom: 18px; }
  header img { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; }
  h1 { font-size: 26px; font-weight: normal; letter-spacing: 1px; }
  .contact { color: #555; font-size: 10.5px; margin-top: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 18px 0 8px; text-align: center; }
  .summary { text-align: justify; line-height: 1.55; }
  .entry { margin-bottom: 10px; }
  .entry-head { display: flex; justify-content: space-between; }
  .title { font-weight: bold; }
  .dates { color: #555; font-size: 10.5px; }
  .entry p { line-height: 1.5; color: #333; }
  .skills { text-align: center; line-height: 1.8; }
</style>
</head>
<body>
  <header>
    <img src="${photoDataUri}" alt="${e(cv.name)}">
    <h1>${e(cv.name)}</h1>
    <div class="contact">${e(cv.contact.email)} · ${e(cv.contact.phone)} · ${e(cv.contact.location)}</div>
  </header>
  <h2>Profile</h2>
  <p class="summary">${e(cv.summary)}</p>
  <h2>Professional Experience</h2>
  ${experience}
  <h2>Education</h2>
  ${education}
  <h2>Skills</h2>
  <p class="skills">${skills}</p>
</body>
</html>`;
};
