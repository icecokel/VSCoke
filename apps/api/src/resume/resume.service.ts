import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { publicDependencyCondition } from '../career-data/career-data-publication';
import type {
  ResumeContentDto,
  ResumeDetailDto,
  ResumeDetailSummaryDto,
  ResumeDocumentDto,
  ResumeLocale,
  ResumePreviewDto,
} from './resume.dto';

type DetailRow = {
  slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  content: string;
};
@Injectable()
export class ResumeService {
  constructor(private readonly dataSource: DataSource) {}

  async getDocument(
    locale: ResumeLocale,
    key = 'pe',
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ResumeDocumentDto> {
    const [row] = await manager.query<
      {
        id: string;
        key: string;
        locale: ResumeLocale;
        version_id: string;
        version_name: string;
        content_hash: string;
        content: ResumeContentDto;
      }[]
    >(
      `SELECT r.id,r.key,r.locale,v.id AS version_id,v.version_name,v.content_hash,v.content FROM resumes r JOIN resume_versions v ON v.id=r.current_version_id AND v.resume_id=r.id WHERE r.key=$1 AND r.locale=$2 AND r.visibility='public' AND ${publicDependencyCondition('d.resume_version_id=v.id')}`,
      [key, locale],
    );
    if (!row) throw new NotFoundException('Resume document not found');
    return {
      ...row.content,
      locale: row.locale,
      documentId: row.id,
      key: row.key,
      versionId: row.version_id,
      versionName: row.version_name,
      contentHash: row.content_hash,
    };
  }

  async getDetails(): Promise<ResumeDetailSummaryDto[]> {
    const rows = await this.dataSource.query<DetailRow[]>(
      `SELECT slug,title,start_date,end_date FROM resume_details detail WHERE visibility='public' AND ${publicDependencyCondition('d.detail_slug=detail.slug AND d.detail_revision=detail.revision')} ORDER BY slug ASC`,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async getDetail(
    slug: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ResumeDetailDto> {
    const [row] = await manager.query<DetailRow[]>(
      `SELECT slug,title,start_date,end_date,content FROM resume_details detail WHERE slug=$1 AND visibility='public' AND ${publicDependencyCondition('d.detail_slug=detail.slug AND d.detail_revision=detail.revision')}`,
      [slug],
    );
    if (!row) throw new NotFoundException('Resume detail not found');
    return { ...this.toSummary(row), content: row.content };
  }

  getPreview(locale: ResumeLocale, key = 'pe'): Promise<ResumePreviewDto> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const document = await this.getDocument(locale, key, manager);
      const slugs = [
        ...new Set(
          [
            ...document.careers.flatMap((career) =>
              career.projects.map((project) => project.fileRef),
            ),
          ].filter((slug): slug is string => Boolean(slug)),
        ),
      ];
      const details: ResumeDetailDto[] = [];
      for (const slug of slugs) {
        try {
          details.push(await this.getDetail(slug, manager));
        } catch (error) {
          if (error instanceof NotFoundException)
            throw new ServiceUnavailableException(
              'Resume preview detail is unavailable',
            );
          throw error;
        }
      }
      return { document, details };
    });
  }

  private toSummary(row: DetailRow): ResumeDetailSummaryDto {
    return {
      slug: row.slug,
      title: row.title,
      ...(row.start_date === null ? {} : { startDate: row.start_date }),
      ...(row.end_date === null ? {} : { endDate: row.end_date }),
    };
  }
}
