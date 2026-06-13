import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameHistory } from './entities/game-history.entity';
import { User } from '../auth/entities/user.entity';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { GameType } from './enums/game-type.enum';

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getQuery: jest.fn().mockReturnValue('SELECT * FROM game_history'),
  getParameters: jest.fn().mockReturnValue({}),
  setParameters: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getRawOne: jest.fn(),
  andWhere: jest.fn().mockReturnThis(),
  subQuery: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
};

const mockGameHistoryRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
  query: jest.fn(), // Raw query 지원
});

describe('GameService', () => {
  let service: GameService;
  let repository: ReturnType<typeof mockGameHistoryRepository>;

  beforeEach(async () => {
    // 각 테스트 전에 모든 모킹 초기화
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: getRepositoryToken(GameHistory),
          useFactory: mockGameHistoryRepository,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    repository = module.get(getRepositoryToken(GameHistory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createHistory', () => {
    it('should create and save a game history with gameType', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 100,
        gameType: GameType.SKY_DROP,
      };
      const savedHistory = { id: 1, ...createDto, user };

      repository.create.mockReturnValue(savedHistory);
      repository.save.mockResolvedValue(savedHistory);

      const result = await service.createHistory(user, createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        user,
      });
      expect(repository.save).toHaveBeenCalledWith(savedHistory);
      expect(result).toEqual(savedHistory);
    });
  });

  describe('getRanking', () => {
    it('유저별 최고 점수만 반환해야 함 (gameType 필터 있음)', async () => {
      const mockUser1 = { id: 'user1', firstName: '홍길', lastName: '동' };
      const mockUser2 = { id: 'user2', firstName: '김철', lastName: '수' };

      repository.query.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const mockRankings = [
        {
          id: '2',
          score: 150,
          gameType: GameType.SKY_DROP,
          userId: 'user2',
          user: mockUser2,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: '1',
          score: 200,
          gameType: GameType.SKY_DROP,
          userId: 'user1',
          user: mockUser1,
          createdAt: new Date('2024-01-01'),
        },
      ];
      repository.find.mockResolvedValue(mockRankings as any);

      const result = await service.getRanking(GameType.SKY_DROP);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE gh."gameType" = $1'),
        [GameType.SKY_DROP],
      );
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user'],
        }),
      );
      expect(result.map((row) => row.id)).toEqual(['1', '2']);
      expect(result).toHaveLength(2);
    });

    it('게임 타입별 유저 최고 점수만 필터링해야 함', async () => {
      const mockUser = { id: 'user1', firstName: '홍길', lastName: '동' };
      const mockRankings = [
        {
          id: '1',
          score: 200,
          gameType: GameType.SKY_DROP,
          userId: 'user1',
          user: mockUser,
          createdAt: new Date('2024-01-01'),
        },
      ];

      repository.query.mockResolvedValue([{ id: '1' }]);
      repository.find.mockResolvedValue(mockRankings as any);

      const result = await service.getRanking(GameType.SKY_DROP);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE gh."gameType" = $1'),
        [GameType.SKY_DROP],
      );
      expect(result).toEqual(mockRankings);
    });

    it('랭킹 대상이 없으면 빈 배열을 반환해야 함', async () => {
      repository.query.mockResolvedValue([]);

      const result = await service.getRanking(GameType.SKY_DROP);

      expect(result).toEqual([]);
      expect(repository.find).not.toHaveBeenCalled();
    });
  });

  describe('getUserBestScore', () => {
    it('should return user best score', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxScore: '100' });

      const result = await service.getUserBestScore('user1', GameType.SKY_DROP);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'MAX(gh.score)',
        'maxScore',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'gh.userId = :userId',
        { userId: 'user1' },
      );
      expect(result).toBe(100);
    });

    it('should return 0 if no score found', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.getUserBestScore('user1', GameType.SKY_DROP);

      expect(result).toBe(0);
    });

    it('should apply date range filter', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxScore: '100' });
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-07'),
      };

      await service.getUserBestScore('user1', GameType.SKY_DROP, dateRange);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'gh.createdAt BETWEEN :start AND :end',
        dateRange,
      );
    });
  });

  describe('getUserRank', () => {
    it('should return user rank', async () => {
      repository.query.mockResolvedValue([{ count: '5' }]);

      const result = await service.getUserRank('user1', 100, GameType.SKY_DROP);

      expect(repository.query).toHaveBeenCalled();
      expect(result).toBe(6); // 5명보다 낮으면 6등
    });

    it('should apply date range filter to rank calculation', async () => {
      repository.query.mockResolvedValue([{ count: '2' }]);
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-07'),
      };

      const result = await service.getUserRank(
        'user1',
        100,
        GameType.SKY_DROP,
        dateRange,
      );

      // Raw query에 dateRange 파라미터가 전달되어야 함
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN'),
        [GameType.SKY_DROP, 100, dateRange.start, dateRange.end],
      );
      expect(result).toBe(3); // 2명보다 낮으면 3등
    });
  });
});
