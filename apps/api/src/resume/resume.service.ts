import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeDocument } from './entities/resume-document.entity';
import { ResumeDetail } from './entities/resume-detail.entity';
import type {
  ResumeDetailDto,
  ResumeDetailSummaryDto,
  ResumeDocumentDto,
  ResumeLocale,
} from './resume.dto';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeDocument)
    private readonly documentRepository: Repository<ResumeDocument>,
    @InjectRepository(ResumeDetail)
    private readonly detailRepository: Repository<ResumeDetail>,
  ) {}

  async getDocument(locale: ResumeLocale): Promise<ResumeDocumentDto> {
    const document = await this.documentRepository.findOneBy({ locale });
    if (!document) throw new NotFoundException('Resume document not found');
    return { ...document.content, locale: document.locale };
  }

  async getDetails(): Promise<ResumeDetailSummaryDto[]> {
    const details = await this.detailRepository.find({
      select: { slug: true, title: true, startDate: true, endDate: true },
      order: { slug: 'ASC' },
    });
    return details.map((detail) => this.toSummary(detail));
  }

  async getDetail(slug: string): Promise<ResumeDetailDto> {
    const detail = await this.detailRepository.findOneBy({ slug });
    if (!detail) throw new NotFoundException('Resume detail not found');
    return { ...this.toSummary(detail), content: detail.content };
  }

  private toSummary(detail: ResumeDetail): ResumeDetailSummaryDto {
    return {
      slug: detail.slug,
      title: detail.title,
      ...(detail.startDate === null ? {} : { startDate: detail.startDate }),
      ...(detail.endDate === null ? {} : { endDate: detail.endDate }),
    };
  }
}
