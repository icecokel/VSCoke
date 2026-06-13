import { Injectable } from '@nestjs/common';

/**
 * 애플리케이션의 루트 서비스
 */
@Injectable()
export class AppService {
  /**
   * Hello World 문자열을 생성하여 반환함
   */
  getHello(): string {
    return 'Hello World!';
  }
}
