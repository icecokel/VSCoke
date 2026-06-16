import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EspressoEquipmentDto } from './espresso-common.dto';
import { EspressoLogResponseDto } from './espresso-log-response.dto';

export class EspressoBeanResponseDto {
  @ApiProperty({
    description: '원두 기록 ID',
    example: 'bean-fritz-jal-doeeo-gasina',
  })
  id: string;

  @ApiProperty({ description: '원두 이름', example: '프릳츠 잘 되어 가시나' })
  name: string;

  @ApiPropertyOptional({ description: '로스터리', example: '프릳츠' })
  roaster?: string;

  @ApiProperty({ type: [String], description: '원두 추출 목표' })
  goals: string[];

  @ApiProperty({
    type: EspressoEquipmentDto,
    description: '공통 장비 기본 세팅',
  })
  defaultEquipment: EspressoEquipmentDto;

  @ApiProperty({ type: [EspressoLogResponseDto], description: '추출 로그' })
  logs: EspressoLogResponseDto[];
}
