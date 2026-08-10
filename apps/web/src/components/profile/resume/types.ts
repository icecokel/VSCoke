export interface ResumeCareerData {
  id: string;
  projects: ResumeProjectData[];
}

export interface ResumeProjectData {
  id: string;
  fileRef?: string;
}

export interface Description {
  subtitle: string;
  detail?: string;
  skills?: string;
  tasks?: string[];
  achievement?: string;
}
