import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const readJson = path => JSON.parse(readFileSync(`${webRoot}/${path}`, "utf8"));
const careers = readJson("src/constants/resume-data.json");
const documents = ["ko-KR", "en-US", "ja-JP"].map(locale => {
  const { resume, profile } = readJson(`messages/${locale}.json`);
  return {
    locale,
    name: resume.name,
    title: resume.title,
    contact: resume.contact,
    introduction: resume.introduction,
    totalExperience: resume.totalExperience,
    lastUpdated: "2026.09",
    careers: careers.map(career => {
      const { projects, ...content } = resume.careers[career.id];
      return {
        id: career.id,
        ...content,
        projects: career.projects.map(project => ({
          id: project.id,
          ...projects[project.id],
          ...(project.fileRef ? { fileRef: project.fileRef } : {}),
        })),
      };
    }),
    education: resume.education,
    skills: resume.skills,
    certifications: resume.certifications.map((certification, index) =>
      index === 0
        ? { ...certification, name: profile.hybridCourse, details: [profile.hybridDesc] }
        : certification,
    ),
    links: resume.links,
    personalProjects: [
      {
        id: "worxphere",
        ...resume.personalProjects.worxphere,
        fileRef: "worxphere-recruitment-board",
      },
    ],
  };
});
const details = readdirSync(`${webRoot}/resume-detail`)
  .filter(file => file.endsWith(".mdx"))
  .sort()
  .map(file => {
    const { data, content } = matter(readFileSync(`${webRoot}/resume-detail/${file}`, "utf8"));
    return { slug: file.slice(0, -4), ...data, content };
  });

export const startResumeFixture = async () => {
  let isAvailable = true;
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let data;

    if (request.method === "POST" && url.pathname === "/__test__/resume-availability") {
      isAvailable = url.searchParams.get("available") === "true";
      response.writeHead(204).end();
      return;
    }
    if (!isAvailable && url.pathname.startsWith("/resume")) {
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: false }));
      return;
    }
    if (url.pathname === "/resume") {
      data = documents.find(item => item.locale === (url.searchParams.get("locale") ?? "ko-KR"));
    } else if (url.pathname === "/resume/details") {
      data = details
        .map(detail => {
          const summary = { ...detail };
          delete summary.content;
          return summary;
        })
        .sort((first, second) => first.slug.localeCompare(second.slug));
    } else if (url.pathname.startsWith("/resume/details/")) {
      data = details.find(item => item.slug === url.pathname.slice("/resume/details/".length));
    }

    response.writeHead(data === undefined ? 404 : 200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data === undefined ? { success: false } : { success: true, data }));
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
};
