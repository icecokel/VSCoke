export interface ResumeCareerData {
  id: string;
  projects: ResumeProjectData[];
}

export interface ResumeProjectData {
  id: string;
  fileRef?: string;
  descriptions?: { id: string; fileRef?: string }[];
}

export interface Career {
  company: string;
  period: string;
  employmentType: string;
  projects: Project[];
}

export interface Project {
  title: string;
  period?: string;
  descriptions?: Description[];
}

export interface Description {
  subtitle: string;
  detail?: string;
  skills?: string;
  tasks?: string[];
  achievement?: string;
}
