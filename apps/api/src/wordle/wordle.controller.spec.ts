import { Test, TestingModule } from '@nestjs/testing';
import { WordleController } from './wordle.controller';
import { WordleService } from './wordle.service';
import { Word } from './entities/word.entity';
import { NotFoundException } from '@nestjs/common';

const mockWordleService = () => ({
  getRandomWord: jest.fn(),
  getWordCount: jest.fn(),
  checkWordExists: jest.fn(),
});

describe('WordleController', () => {
  let controller: WordleController;
  let service: ReturnType<typeof mockWordleService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordleController],
      providers: [
        {
          provide: WordleService,
          useFactory: mockWordleService,
        },
      ],
    }).compile();

    controller = module.get<WordleController>(WordleController);
    service = module.get(WordleService);
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /wordle/word', () => {
    // 성공 케이스 1
    it('랜덤 단어를 성공적으로 반환해야 함', async () => {
      const mockWord: Word = {
        id: 1,
        word: 'apple',
        createdAt: new Date(),
      };

      service.getRandomWord.mockResolvedValue(mockWord);

      const result = await controller.getRandomWord();

      expect(service.getRandomWord).toHaveBeenCalled();
      expect(result).toEqual({ word: 'apple' });
    });

    // 성공 케이스 2
    it('응답 형식이 { word: string } 형태여야 함', async () => {
      const mockWord: Word = {
        id: 2,
        word: 'grape',
        createdAt: new Date(),
      };

      service.getRandomWord.mockResolvedValue(mockWord);

      const result = await controller.getRandomWord();

      expect(result).toHaveProperty('word');
      expect(typeof result.word).toBe('string');
      expect(Object.keys(result)).toEqual(['word']);
    });

    // 실패 케이스 1
    it('서비스에서 NotFoundException 발생 시 전파해야 함', async () => {
      service.getRandomWord.mockRejectedValue(
        new NotFoundException('단어가 존재하지 않습니다.'),
      );

      await expect(controller.getRandomWord()).rejects.toThrow(
        NotFoundException,
      );
    });

    // 실패 케이스 2
    it('서비스에서 일반 오류 발생 시 전파해야 함', async () => {
      service.getRandomWord.mockRejectedValue(new Error('Unexpected error'));

      await expect(controller.getRandomWord()).rejects.toThrow(
        'Unexpected error',
      );
    });

    // 실패 케이스 3
    it('서비스가 null을 반환하면 오류가 발생해야 함', async () => {
      service.getRandomWord.mockResolvedValue(null);

      // null.word 접근 시 오류 발생
      await expect(controller.getRandomWord()).rejects.toThrow();
    });

    // 실패 케이스 4
    it('서비스가 undefined를 반환하면 오류가 발생해야 함', async () => {
      service.getRandomWord.mockResolvedValue(undefined);

      // undefined.word 접근 시 오류 발생
      await expect(controller.getRandomWord()).rejects.toThrow();
    });
  });

  describe('POST /wordle/check', () => {
    it('단어가 존재하면 true를 반환해야 함', async () => {
      service.checkWordExists.mockResolvedValue(true);

      const result = await controller.checkWord({ word: 'apple' });

      expect(service.checkWordExists).toHaveBeenCalledWith('apple');
      expect(result).toEqual({ exists: true });
    });

    it('단어가 존재하지 않으면 false를 반환해야 함', async () => {
      service.checkWordExists.mockResolvedValue(false);

      const result = await controller.checkWord({ word: 'korea' });

      expect(service.checkWordExists).toHaveBeenCalledWith('korea');
      expect(result).toEqual({ exists: false });
    });
  });
});
