import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { WordleService } from './wordle.service';
import { WordResponseDto } from './dto/word-response.dto';
import { CheckWordDto } from './dto/check-word.dto';
import { CheckWordResponseDto } from './dto/check-word-response.dto';

/**
 * 워들 게임 관련 API를 제공하는 컨트롤러
 */
@ApiTags('Wordle')
@Controller('wordle')
@ApiInternalServerErrorResponse({
  description: '분류되지 않은 서버 오류',
  type: ApiErrorResponseDto,
})
export class WordleController {
  constructor(private readonly wordleService: WordleService) {}

  /**
   * 랜덤한 5글자 영단어를 반환함
   */
  @Get('word')
  @ApiNotFoundResponse({
    description: '준비된 단어가 없음',
    type: ApiErrorResponseDto,
  })
  @ApiOperation({ summary: '랜덤 5글자 단어 조회' })
  @ApiOkResponse({
    type: WordResponseDto,
    description: '랜덤으로 선택된 5글자 영단어',
  })
  async getRandomWord(): Promise<WordResponseDto> {
    const wordEntity = await this.wordleService.getRandomWord();
    return { word: wordEntity.word };
  }

  /**
   * 단어의 유효성을 검사함 (DB 존재 여부)
   */
  @Post('check')
  @ApiBadRequestResponse({
    description: '입력 단어가 5글자 영문이 아니거나 허용되지 않은 필드가 있음',
    type: ApiErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '단어 유효성 검사' })
  @ApiOkResponse({
    description: '단어 존재 여부',
    type: CheckWordResponseDto,
  })
  async checkWord(
    @Body() checkWordDto: CheckWordDto,
  ): Promise<CheckWordResponseDto> {
    const exists = await this.wordleService.checkWordExists(checkWordDto.word);
    return { exists };
  }
}
