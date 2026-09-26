import type { Cv } from "../cv/types";
import { escapeHtml } from "./escape";

export const renderModern = ({ cv, photoDataUri }: { cv: Cv; photoDataUri: string }): string => {
  const e = escapeHtml;
  const experience = cv.experience
    .map(
      (job) => `
      <section class="job">
        <div class="job-header">
          <strong>${e(job.title)}</strong>
          <span class="dates">${e(job.startDate)} — ${job.endDate ? e(job.endDate) : "Present"}</span>
        </div>
        <div class="company">${e(job.company)}</div>
        <p>${e(job.description)}</p>
      </section>`,
    )
    .join("");
  const education = cv.education
    .map(
      (ed) => `
      <section class="job">
        <div class="job-header">
          <strong>${e(ed.degree)}</strong>
          <span class="dates">${e(ed.year)}</span>
        </div>
        <div class="company">${e(ed.institution)}</div>
      </section>`,
    )
    .join("");
  const skills = cv.skills.map((skill) => `<li>${e(skill)}</li>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #2b2b2b; }
  .layout { display: flex; min-height: 100vh; }
  .sidebar { width: 34%; background: #1f3a5f; color: #fff; padding: 28px 22px; }
  .sidebar img { width: 130px; height: 130px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 18px; border: 3px solid #fff; }
  .sidebar h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 22px 0 8px; border-bottom: 1px solid #4a6a94; padding-bottom: 4px; }
  .sidebar p, .sidebar li { font-size: 10.5px; line-height: 1.55; }
  .sidebar ul { list-style: none; }
  .sidebar li { padding: 2px 0; }
  .main { width: 66%; padding: 28px 26px; }
  .main h1 { font-size: 24px; color: #1f3a5f; }
  .main h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #1f3a5f; margin: 20px 0 10px; border-bottom: 2px solid #1f3a5f; padding-bottom: 4px; }
  .summary { line-height: 1.55; color: #444; }
  .job { margin-bottom: 12px; }
  .job-header { display: flex; justify-content: space-between; font-size: 11.5px; }
  .dates { color: #666; font-size: 10px; }
  .company { color: #666; font-style: italic; margin: 1px 0 3px; }
  .job p { line-height: 1.5; color: #444; }
</style>
</head>
<body>
  <div class="layout">
    <div class="sidebar">
      <img src="${photoDataUri}" alt="${e(cv.name)}">
      <h2>Contact</h2>
      <p>${e(cv.contact.email)}</p>
      <p>${e(cv.contact.phone)}</p>
      <p>${e(cv.contact.location)}</p>
      <h2>Skills</h2>
      <ul>${skills}</ul>
    </div>
    <div class="main">
      <h1>${e(cv.name)}</h1>
      <h2>Profile</h2>
      <p class="summary">${e(cv.summary)}</p>
      <h2>Experience</h2>
      ${experience}
      <h2>Education</h2>
      ${education}
    </div>
  </div>
</body>
</html>`;
};
