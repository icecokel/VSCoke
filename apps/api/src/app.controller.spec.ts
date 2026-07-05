import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return API process health details', () => {
      const health = appController.getHealth();

      expect(health.status).toBe('ok');
      expect(Number.isFinite(health.uptime)).toBe(true);
      expect(typeof health.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
    });
  });
});
