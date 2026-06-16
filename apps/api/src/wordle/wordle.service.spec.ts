import { Test, TestingModule } from '@nestjs/testing';
import { WordleService } from './wordle.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Word } from './entities/word.entity';
import { NotFoundException } from '@nestjs/common';

const mockQueryBuilder = {
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
};

const mockWordRepository = () => ({
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
  count: jest.fn(),
  exist: jest.fn(),
});

describe('WordleService', () => {
  let service: WordleService;
  let repository: ReturnType<typeof mockWordRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordleService,
        {
          provide: getRepositoryToken(Word),
          useFactory: mockWordRepository,
        },
      ],
    }).compile();

    service = module.get<WordleService>(WordleService);
    repository = module.get(getRepositoryToken(Word));
  });

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('getRandomWord', () => {
    // 성공 케이스 1
    it('랜덤 단어를 성공적으로 반환해야 함', async () => {
      const mockWord: Word = {
        id: 1,
        word: 'apple',
        createdAt: new Date(),
      };

      mockQueryBuilder.getOne.mockResolvedValue(mockWord);

      const result = await service.getRandomWord();

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('word');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('RANDOM()');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWord);
      expect(result.word).toBe('apple');
    });

    // 성공 케이스 2
    it('반환된 단어는 5글자여야 함', async () => {
      const mockWord: Word = {
        id: 2,
        word: 'grape',
        createdAt: new Date(),
      };

      mockQueryBuilder.getOne.mockResolvedValue(mockWord);

      const result = await service.getRandomWord();

      expect(result.word).toHaveLength(5);
    });

    // 실패 케이스 1
    it('단어가 없으면 NotFoundException을 던져야 함', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.getRandomWord()).rejects.toThrow(NotFoundException);
    });

    // 실패 케이스 2
    it('단어가 undefined인 경우 NotFoundException을 던져야 함', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(undefined);

      await expect(service.getRandomWord()).rejects.toThrow(NotFoundException);
    });

    // 실패 케이스 3
    it('DB 오류 시 예외를 전파해야 함', async () => {
      const dbError = new Error('Database connection failed');
      mockQueryBuilder.getOne.mockRejectedValue(dbError);

      await expect(service.getRandomWord()).rejects.toThrow(
        'Database connection failed',
      );
    });

    // 실패 케이스 4
    it('createQueryBuilder 호출 시 오류가 발생하면 예외를 전파해야 함', async () => {
      repository.createQueryBuilder.mockImplementation(() => {
        throw new Error('QueryBuilder initialization failed');
      });

      await expect(service.getRandomWord()).rejects.toThrow(
        'QueryBuilder initialization failed',
      );
    });
  });

  describe('getWordCount', () => {
    it('저장된 단어 개수를 반환해야 함', async () => {
      repository.count.mockResolvedValue(2000);

      const result = await service.getWordCount();

      expect(repository.count).toHaveBeenCalled();
      expect(result).toBe(2000);
    });

    it('단어가 없으면 0을 반환해야 함', async () => {
      repository.count.mockResolvedValue(0);

      const result = await service.getWordCount();

      expect(result).toBe(0);
    });
  });

  describe('checkWordExists', () => {
    it('단어가 존재하면 true를 반환해야 함', async () => {
      repository.exist.mockResolvedValue(true);

      const result = await service.checkWordExists('apple');

      expect(repository.exist).toHaveBeenCalledWith({
        where: { word: 'apple' },
      });
      expect(result).toBe(true);
    });

    it('단어가 존재하지 않으면 false를 반환해야 함', async () => {
      repository.exist.mockResolvedValue(false);

      const result = await service.checkWordExists('korea');

      expect(repository.exist).toHaveBeenCalledWith({
        where: { word: 'korea' },
      });
      expect(result).toBe(false);
    });
  });
});
