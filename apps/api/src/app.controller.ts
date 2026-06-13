import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * 애플리케이션의 루트 컨트롤러
 */
@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 기본적인 Hello World 메시지를 반환함
   */
  @Get()
  @ApiOperation({ summary: '서버 상태 확인' })
  @ApiOkResponse({
    description: '서버가 정상적으로 동작 중임을 나타내는 메시지',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
