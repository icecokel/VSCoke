import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateResumeConversationDto,
  ResumeConversationAccessDto,
  ResumeConversationHistoryDto,
} from './dto/resume-conversation.dto';
import {
  ResumeConversationService,
  RESUME_CONVERSATION_TOKEN_HEADER,
} from './resume-conversation.service';
import { ResumeRagOriginGuard } from './resume-rag-origin.guard';
import { ResumeConversationRateLimitGuard } from './resume-conversation-rate-limit.guard';

@ApiTags('Resume conversations')
@Controller('resume-rag/conversations')
@UseGuards(ResumeRagOriginGuard, ResumeConversationRateLimitGuard)
export class ResumeConversationController {
  constructor(private readonly conversations: ResumeConversationService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '익명 대화 생성. 30일 후 만료된다.' })
  @ApiCreatedResponse({ type: ResumeConversationAccessDto })
  create(
    @Body() request: CreateResumeConversationDto,
  ): Promise<ResumeConversationAccessDto> {
    return this.conversations.create(request);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: RESUME_CONVERSATION_TOKEN_HEADER, required: true })
  @ApiOkResponse({ type: ResumeConversationHistoryDto })
  @ApiNotFoundResponse({ description: '접근키 불일치, 삭제 또는 만료된 대화' })
  history(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers(RESUME_CONVERSATION_TOKEN_HEADER) token?: string,
  ): Promise<ResumeConversationHistoryDto> {
    return this.conversations.history(id, token);
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: RESUME_CONVERSATION_TOKEN_HEADER, required: true })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['deleted'],
      properties: { deleted: { type: 'boolean' } },
    },
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers(RESUME_CONVERSATION_TOKEN_HEADER) token?: string,
  ): Promise<{ deleted: boolean }> {
    await this.conversations.remove(id, token);
    return { deleted: true };
  }
}
