export type Seniority = "junior" | "mid" | "senior" | "lead";

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  seniority: Seniority;
  sector: string;
  language: string;
  yearsOfExperience: number;
  appearance: {
    ageRange: string;
    gender: string;
    ethnicity: string;
  };
}

export interface CvContent {
  summary: string;
  experience: CvExperience[];
  education: CvEducation[];
  skills: string[];
}

export interface CvExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

export interface CvEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface Cv extends CvContent {
  name: string;
  contact: {
    email: string;
    phone: string;
    location: string;
  };
  photoPath: string;
}
