import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const readJson = path => JSON.parse(readFileSync(`${webRoot}/${path}`, "utf8"));
const careers = readJson("src/constants/resume-data.json");
const legacyDocuments = ["ko-KR", "en-US", "ja-JP"].map(locale => {
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
const documents = ["pe", "fe", "worxphere", "nexon", "ko-only"].flatMap((key, index) =>
  legacyDocuments
    .filter(document => key !== "ko-only" || document.locale === "ko-KR")
    .map(document => {
      const documentId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      const content =
        key === "pe"
          ? document
          : {
              ...document,
              name: `Fixture ${key}`,
              title: `Fixture ${key} · ${document.locale} · v1`,
              introduction: [`Synthetic ${key} resume fixture`],
            };
      return {
        ...content,
        key,
        documentId,
        versionId: documentId.replace("4000", "4001"),
        versionName: "v1",
        contentHash: createHash("sha256").update(JSON.stringify(content)).digest("hex"),
      };
    }),
);

const details = readdirSync(`${webRoot}/resume-detail`)
  .filter(file => file.endsWith(".mdx"))
  .sort()
  .map(file => {
    const { data, content } = matter(readFileSync(`${webRoot}/resume-detail/${file}`, "utf8"));
    return { slug: file.slice(0, -4), ...data, content };
  });

export const startResumeFixture = async () => {
  let isAvailable = true;
  const currentDocuments = structuredClone(documents);
  const unavailableDetails = new Set();
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let data;

    if (request.method === "POST" && url.pathname === "/__test__/resume-availability") {
      isAvailable = url.searchParams.get("available") === "true";
      response.writeHead(204).end();
      return;
    }
    if (request.method === "POST" && url.pathname === "/__test__/resume-version") {
      const document = currentDocuments.find(
        item =>
          item.key === url.searchParams.get("resume") &&
          item.locale === (url.searchParams.get("locale") ?? "ko-KR"),
      );
      if (!document) {
        response.writeHead(404).end();
        return;
      }
      const nextVersion = Number(document.versionName.slice(1)) + 1;
      document.versionName = `v${nextVersion}`;
      document.versionId = document.documentId.replace(
        "4000",
        `4${nextVersion.toString(16).padStart(3, "0")}`,
      );
      document.title = `Fixture ${document.key} · ${document.locale} · ${document.versionName}`;
      document.contentHash = createHash("sha256").update(document.title).digest("hex");
      response.writeHead(204).end();
      return;
    }
    if (request.method === "POST" && url.pathname === "/__test__/resume-detail-availability") {
      const slug = url.searchParams.get("slug");
      if (url.searchParams.get("available") === "true") unavailableDetails.delete(slug);
      else unavailableDetails.add(slug);
      response.writeHead(204).end();
      return;
    }
    if (!isAvailable && url.pathname.startsWith("/resume")) {
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: false }));
      return;
    }
    if (url.pathname === "/resume" || url.pathname === "/resume/preview") {
      const document = currentDocuments.find(
        item =>
          item.locale === (url.searchParams.get("locale") ?? "ko-KR") &&
          item.key === (url.searchParams.get("resume") ?? "pe"),
      );
      if (document && url.pathname === "/resume/preview") {
        const slugs = [
          ...new Set(
            document.careers.flatMap(career =>
              career.projects.flatMap(project => (project.fileRef ? [project.fileRef] : [])),
            ),
          ),
        ];
        if (
          slugs.some(
            slug => unavailableDetails.has(slug) || !details.some(detail => detail.slug === slug),
          )
        ) {
          response.writeHead(503, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ success: false }));
          return;
        }
        data = {
          document,
          details: slugs.map(slug => details.find(detail => detail.slug === slug)),
        };
      } else data = document;
    } else if (url.pathname === "/resume/details") {
      data = details
        .filter(detail => !unavailableDetails.has(detail.slug))
        .map(detail => {
          const summary = { ...detail };
          delete summary.content;
          return summary;
        })
        .sort((first, second) => first.slug.localeCompare(second.slug));
    } else if (url.pathname.startsWith("/resume/details/")) {
      data = details.find(
        item =>
          item.slug === url.pathname.slice("/resume/details/".length) &&
          !unavailableDetails.has(item.slug),
      );
    }

    response.writeHead(data === undefined ? 404 : 200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data === undefined ? { success: false } : { success: true, data }));
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
};
