import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { WordleService } from './wordle.service';
import { WordResponseDto } from './dto/word-response.dto';
import { CheckWordDto } from './dto/check-word.dto';
import { CheckWordResponseDto } from './dto/check-word-response.dto';

/**
 * 워들 게임 관련 API를 제공하는 컨트롤러
 */
@ApiTags('Wordle')
@Controller('wordle')
export class WordleController {
  constructor(private readonly wordleService: WordleService) {}

  /**
   * 랜덤한 5글자 영단어를 반환함
   */
  @Get('word')
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
