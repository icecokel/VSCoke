import { Module } from '@nestjs/common';
import { ResumeRagModule } from '../resume-rag/resume-rag.module';
import { MainChatController } from './main-chat.controller';
import { MainChatRateLimitGuard } from './main-chat-rate-limit.guard';
import { MainChatService } from './main-chat.service';

@Module({
  imports: [ResumeRagModule],
  controllers: [MainChatController],
  providers: [MainChatRateLimitGuard, MainChatService],
})
export class MainChatModule {}
