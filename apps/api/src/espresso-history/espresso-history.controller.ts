import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { EspressoBeanResponseDto } from './dto/espresso-bean-response.dto';
import { EspressoHistoryService } from './espresso-history.service';

@ApiTags('EspressoHistory')
@Controller('espresso-history')
export class EspressoHistoryController {
  constructor(
    private readonly espressoHistoryService: EspressoHistoryService,
  ) {}

  @Get('beans')
  @ApiOperation({ summary: '에스프레소 원두 목록 조회' })
  @ApiOkResponse({
    description: '에스프레소 원두 목록 조회 성공',
    type: [EspressoBeanResponseDto],
  })
  async getBeans(): Promise<EspressoBeanResponseDto[]> {
    return this.espressoHistoryService.getBeans();
  }

  @Get('beans/:id')
  @ApiOperation({ summary: '에스프레소 원두 상세 조회' })
  @ApiParam({
    name: 'id',
    description: '원두 기록 ID',
    example: 'bean-fritz-jal-doeeo-gasina',
  })
  @ApiOkResponse({
    description: '에스프레소 원두 상세 조회 성공',
    type: EspressoBeanResponseDto,
  })
  @ApiNotFoundResponse({ description: '해당 원두 기록이 존재하지 않음' })
  async getBeanById(@Param('id') id: string): Promise<EspressoBeanResponseDto> {
    return this.espressoHistoryService.getBeanById(id);
  }
}
