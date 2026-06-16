import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * 단어 유효성 검사 요청 DTO
 */
export class CheckWordDto {
  @ApiProperty({
    description: '확인할 5글자 영단어',
    example: 'apple',
    minLength: 5,
    maxLength: 5,
  })
  @IsString()
  @Length(5, 5, { message: '단어는 반드시 5글자여야 합니다.' })
  @Matches(/^[a-zA-Z]+$/, {
    message: '단어는 영문자로만 구성되어야 합니다.',
  })
  word: string;
}
