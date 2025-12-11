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
  phase?: Phase[];
}

export interface Description {
  subtitle: string;
  detail?: string;
  skills?: string;
  tasks?: string[];
  achievement?: string;
}

export interface Phase {
  name: string;
  descriptions: Description[];
  note?: string;
}
