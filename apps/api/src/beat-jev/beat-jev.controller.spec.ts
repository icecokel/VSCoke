import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { BeatJevController } from './beat-jev.controller';
import { BeatJevService } from './beat-jev.service';
import { JevClientService } from './jev-client.service';

// 핸들러에 선언된 @HttpCode 메타데이터를 읽는다. 메서드를 바인딩 없이 꺼내지 않도록 descriptor를 쓴다.
const httpCodeOf = (handler: keyof BeatJevController): unknown =>
  Reflect.getMetadata(
    HTTP_CODE_METADATA,
    Object.getOwnPropertyDescriptor(BeatJevController.prototype, handler)
      ?.value as object,
  );

describe('BeatJevController', () => {
  it.each([undefined, '', '   ', 'test-key'])(
    'reports only availability and prevents starting without a key: %s',
    (key) => {
      const jevClient = new JevClientService({
        get: () => key,
      } as unknown as ConfigService);
      const service = new BeatJevService(jevClient);
      const createMatch = jest.spyOn(service, 'createMatch');
      const controller = new BeatJevController(service, jevClient);
      const enabled = key === 'test-key';

      expect(controller.getStatus()).toEqual({ enabled });
      if (enabled) {
        expect(controller.createMatch().status).toBe('PLAYING');
        expect(createMatch).toHaveBeenCalledTimes(1);
      } else {
        expect(() => controller.createMatch()).toThrow(
          ServiceUnavailableException,
        );
        expect(createMatch).not.toHaveBeenCalled();
      }
    },
  );

  // 매치 갱신 POST는 OpenAPI 문서(200)와 실제 응답 코드가 일치해야 한다
  it.each(['playAction', 'continueJev', 'nextGame'] as const)(
    'responds with 200 for match mutation handler: %s',
    (handler) => {
      expect(httpCodeOf(handler)).toBe(HttpStatus.OK);
    },
  );

  it('keeps the default 201 for match creation', () => {
    expect(httpCodeOf('createMatch')).toBeUndefined();
  });
});
