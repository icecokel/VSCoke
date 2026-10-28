import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  ResumeCareerDto,
  ResumeDocumentDto,
  ResumeProjectDto,
} from '../../resume/resume.dto';
import {
  resumeDetailSnapshot,
  resumeDocumentSnapshot,
} from './resume-content-snapshot';

const webRoot = resolve(__dirname, '../../../../web');
type LocalizedResume = Omit<
  ResumeDocumentDto,
  'locale' | 'careers' | 'personalProjects' | 'lastUpdated'
> & {
  careers: Record<
    string,
    Omit<ResumeCareerDto, 'id' | 'projects'> & {
      projects: Record<string, Omit<ResumeProjectDto, 'id' | 'fileRef'>>;
    }
  >;
  personalProjects: { worxphere: { title: string; description: string } };
};

describe('공개 이력서 초기 스냅샷', () => {
  it('세 언어의 공개 회사·프로젝트 순서와 모든 본문을 보존한다', () => {
    const careers = JSON.parse(
      readFileSync(resolve(webRoot, 'src/constants/resume-data.json'), 'utf8'),
    ) as Array<{
      id: string;
      projects: Array<{ id: string; fileRef?: string }>;
    }>;
    expect(resumeDocumentSnapshot.map((document) => document.locale)).toEqual([
      'ko-KR',
      'en-US',
      'ja-JP',
    ]);
    for (const document of resumeDocumentSnapshot) {
      const { resume, profile } = JSON.parse(
        readFileSync(
          resolve(webRoot, `messages/${document.locale}.json`),
          'utf8',
        ),
      ) as {
        resume: LocalizedResume;
        profile: { hybridCourse: string; hybridDesc: string };
      };
      expect(document).toEqual({
        locale: document.locale,
        name: resume.name,
        title: resume.title,
        contact: resume.contact,
        introduction: resume.introduction,
        totalExperience: resume.totalExperience,
        lastUpdated: '2026.09',
        careers: careers.map((career) => {
          const { projects, ...content } = resume.careers[career.id];
          return {
            id: career.id,
            ...content,
            projects: career.projects.map((project) => ({
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
            ? {
                ...certification,
                name: profile.hybridCourse,
                details: [profile.hybridDesc],
              }
            : certification,
        ),
        links: resume.links,
        personalProjects: [
          {
            id: 'worxphere',
            ...resume.personalProjects.worxphere,
            fileRef: 'worxphere-recruitment-board',
          },
        ],
      });
    }
  });

  it('모든 상세 slug·메타데이터·MDX 본문을 보존한다', () => {
    const files = readdirSync(resolve(webRoot, 'resume-detail'))
      .filter((file) => file.endsWith('.mdx'))
      .sort();
    expect(resumeDetailSnapshot.map((detail) => `${detail.slug}.mdx`)).toEqual(
      files,
    );
    expect(files).toHaveLength(10);
    for (const detail of resumeDetailSnapshot) {
      const source = readFileSync(
        resolve(webRoot, `resume-detail/${detail.slug}.mdx`),
        'utf8',
      );
      const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
      expect(frontmatter).not.toBeNull();
      if (!frontmatter) throw new Error('상세 frontmatter가 없음');
      const fields = Object.fromEntries(
        frontmatter[1].split('\n').map((line) => {
          const separator = line.indexOf(':');
          return [
            line.slice(0, separator),
            JSON.parse(line.slice(separator + 1).trim()) as string,
          ];
        }),
      );
      expect(detail).toEqual({
        slug: detail.slug,
        ...fields,
        content: source.slice(frontmatter[0].length),
      });
    }
  });
});
