import fs from "fs";
import path from "path";
import matter from "gray-matter";

const resumeDetailDirectory = path.join(process.cwd(), "resume-detail");

export interface ResumeDetail {
  slug: string;
  title: string;
  startDate?: string;
  endDate?: string;
  content: string;
}

export const getResumeDetailBySlug = (slug: string): ResumeDetail | null => {
  const fullPath = path.join(resumeDetailDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || "",
    startDate: data.startDate,
    endDate: data.endDate,
    content,
  };
};

export const getAllResumeDetails = (): ResumeDetail[] => {
  if (!fs.existsSync(resumeDetailDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(resumeDetailDirectory);
  const allResumeDetails = fileNames
    .filter(fileName => fileName.endsWith(".mdx"))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, "");
      return getResumeDetailBySlug(slug);
    })
    .filter((detail): detail is ResumeDetail => detail !== null);

  return allResumeDetails;
};
