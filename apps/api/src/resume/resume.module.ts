import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeDocument } from './entities/resume-document.entity';
import { ResumeDetail } from './entities/resume-detail.entity';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeDocument, ResumeDetail])],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
