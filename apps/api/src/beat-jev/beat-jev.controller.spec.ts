import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BeatJevController } from './beat-jev.controller';
import { BeatJevService } from './beat-jev.service';
import { JevClientService } from './jev-client.service';

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
});
