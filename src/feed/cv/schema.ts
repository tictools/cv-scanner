import { z } from "zod";

const experienceSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1).nullable(),
  description: z.string().min(1),
});

const educationSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  year: z.string().min(1),
});

/** Schema of the narrative content the LLM returns as structured output. */
export const cvContentSchema = z.object({
  summary: z.string().min(1),
  experience: z.array(experienceSchema).min(1),
  education: z.array(educationSchema).min(1),
  skills: z.array(z.string().min(1)).min(1),
});

/** Schema of the full render-ready CV (candidate metadata + LLM content). */
export const cvSchema = cvContentSchema.extend({
  name: z.string().min(1),
  contact: z.object({
    email: z.email(),
    phone: z.string().min(1),
    location: z.string().min(1),
  }),
  photoPath: z.string().min(1),
});
