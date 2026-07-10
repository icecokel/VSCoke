import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameHistory } from './entities/game-history.entity';
import { GamePokeLoungeState } from './entities/game-poke-lounge-state.entity';
import { User } from '../auth/entities/user.entity';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { SavePokeLoungeStateDto } from './dto/save-poke-lounge-state.dto';
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

const mockPokeLoungeStateRepository = () => ({
  query: jest.fn(),
  findOne: jest.fn(),
});

describe('GameService', () => {
  let service: GameService;
  let repository: ReturnType<typeof mockGameHistoryRepository>;
  let pokeLoungeStateRepository: ReturnType<
    typeof mockPokeLoungeStateRepository
  >;

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
        {
          provide: getRepositoryToken(GamePokeLoungeState),
          useFactory: mockPokeLoungeStateRepository,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    repository = module.get(getRepositoryToken(GameHistory));
    pokeLoungeStateRepository = module.get(
      getRepositoryToken(GamePokeLoungeState),
    );
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

    it('비정상적으로 큰 점수는 저장 전에 거절해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 999999999,
        gameType: GameType.SKY_DROP,
        playTime: 1,
      };

      await expect(service.createHistory(user, createDto)).rejects.toThrow(
        'SKY_DROP score must be between 1 and 100000',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('플레이 시간 대비 불가능한 점수는 저장 전에 거절해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 10000,
        gameType: GameType.SKY_DROP,
        playTime: 1,
      };

      await expect(service.createHistory(user, createDto)).rejects.toThrow(
        'SKY_DROP score exceeds allowed score rate',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('소수점 점수는 저장 전에 거절해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 100.5,
        gameType: GameType.SKY_DROP,
      };

      await expect(service.createHistory(user, createDto)).rejects.toThrow(
        'SKY_DROP score must be an integer',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('유효한 점수와 플레이 시간은 저장해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 12000,
        gameType: GameType.SKY_DROP,
        playTime: 30,
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

    it('Poke Lounge 유효 점수와 플레이 시간은 저장해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 300,
        gameType: GameType.POKE_LOUNGE,
        playTime: 30,
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

    it('Poke Lounge 정책보다 큰 점수는 저장 전에 거절해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 1001,
        gameType: GameType.POKE_LOUNGE,
        playTime: 30,
      };

      await expect(service.createHistory(user, createDto)).rejects.toThrow(
        'POKE_LOUNGE score must be between 1 and 1000',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('Poke Lounge 비정상 플레이 시간은 저장 전에 거절해야 함', async () => {
      const user = new User();
      user.id = 'test-id';
      const createDto: CreateGameHistoryDto = {
        score: 300,
        gameType: GameType.POKE_LOUNGE,
        playTime: 0,
      };

      await expect(service.createHistory(user, createDto)).rejects.toThrow(
        'POKE_LOUNGE playTime must be between 1 and 86400 seconds',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
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
        expect.stringContaining('gh.score BETWEEN $2 AND $3'),
        [GameType.SKY_DROP, 1, 100000, 1, 86400, 2000],
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
        expect.stringContaining('gh.score BETWEEN $2 AND $3'),
        [GameType.SKY_DROP, 1, 100000, 1, 86400, 2000],
      );
      expect(result).toEqual(mockRankings);
    });

    it('랭킹 대상이 없으면 빈 배열을 반환해야 함', async () => {
      repository.query.mockResolvedValue([]);

      const result = await service.getRanking(GameType.SKY_DROP);

      expect(result).toEqual([]);
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('Poke Lounge의 미검증 제출물은 공개 랭킹에서 제외해야 함', async () => {
      await expect(service.getRanking(GameType.POKE_LOUNGE)).resolves.toEqual(
        [],
      );

      expect(repository.query).not.toHaveBeenCalled();
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

    it('저장된 비정상 점수를 최고 점수 산정에서 제외해야 함', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxScore: '100' });

      await service.getUserBestScore('user1', GameType.SKY_DROP);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('gh.score BETWEEN :minScore AND :maxScore'),
        {
          minScore: 1,
          maxScore: 100000,
          minPlayTimeSeconds: 1,
          maxPlayTimeSeconds: 86400,
          maxScorePerSecond: 2000,
        },
      );
    });

    it('Poke Lounge 정책 값으로 유저 최고 점수를 조회해야 함', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxScore: '300' });

      const result = await service.getUserBestScore(
        'user1',
        GameType.POKE_LOUNGE,
      );

      expect(result).toBe(300);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('gh.score BETWEEN :minScore AND :maxScore'),
        {
          minScore: 1,
          maxScore: 1000,
          minPlayTimeSeconds: 1,
          maxPlayTimeSeconds: 86400,
          maxScorePerSecond: 1000,
        },
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
        [
          GameType.SKY_DROP,
          100,
          1,
          100000,
          1,
          86400,
          2000,
          dateRange.start,
          dateRange.end,
        ],
      );
      expect(result).toBe(3); // 2명보다 낮으면 3등
    });

    it('저장된 비정상 점수를 등수 산정에서 제외해야 함', async () => {
      repository.query.mockResolvedValue([{ count: '5' }]);

      await service.getUserRank('user1', 100, GameType.SKY_DROP);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('score BETWEEN $3 AND $4'),
        [GameType.SKY_DROP, 100, 1, 100000, 1, 86400, 2000],
      );
    });

    it('Poke Lounge의 미검증 제출물에는 공개 등수를 계산하지 않아야 함', async () => {
      repository.query.mockResolvedValue([{ count: '2' }]);

      await expect(
        service.getUserRank('user1', 300, GameType.POKE_LOUNGE),
      ).resolves.toBeNull();

      expect(repository.query).not.toHaveBeenCalled();
    });
  });

  describe('savePokeLoungeState', () => {
    it('사용자 id 기준으로 Poke Lounge 상태를 upsert하고 저장본을 반환해야 함', async () => {
      const user = new User();
      user.id = 'poke-user';
      const clientUpdatedAt = '2026-07-08T12:00:00.000Z';
      const dto: SavePokeLoungeStateDto = {
        state: {
          trainer: { x: 12, y: 3 },
          party: ['pikachu', 'eevee'],
        },
        clientUpdatedAt,
      };
      const savedState = {
        id: 'state-id',
        userId: user.id,
        user,
        state: dto.state,
        clientUpdatedAt: new Date(clientUpdatedAt),
        createdAt: new Date('2026-07-08T12:00:01.000Z'),
        updatedAt: new Date('2026-07-08T12:00:02.000Z'),
      } as GamePokeLoungeState;

      pokeLoungeStateRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedState);

      const result = await service.savePokeLoungeState(user, dto);

      expect(pokeLoungeStateRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT ("userId") DO UPDATE'),
        [user.id, JSON.stringify(dto.state), new Date(clientUpdatedAt)],
      );
      expect(pokeLoungeStateRepository.query).toHaveBeenCalledWith(
        expect.stringContaining(
          '"game_poke_lounge_state"."clientUpdatedAt" <= EXCLUDED."clientUpdatedAt"',
        ),
        expect.any(Array),
      );
      expect(pokeLoungeStateRepository.findOne).toHaveBeenLastCalledWith({
        where: { userId: user.id },
      });
      expect(result).toEqual(savedState);
    });

    it('clientUpdatedAt이 없으면 null로 저장해야 함', async () => {
      const user = new User();
      user.id = 'poke-user';
      const dto: SavePokeLoungeStateDto = {
        state: {
          room: 'LOUNGE',
        },
      };
      const savedState = {
        id: 'state-id',
        userId: user.id,
        user,
        state: dto.state,
        clientUpdatedAt: null,
        createdAt: new Date('2026-07-08T12:00:01.000Z'),
        updatedAt: new Date('2026-07-08T12:00:02.000Z'),
      } as GamePokeLoungeState;

      pokeLoungeStateRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedState);

      const result = await service.savePokeLoungeState(user, dto);

      expect(pokeLoungeStateRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "game_poke_lounge_state"'),
        [user.id, JSON.stringify(dto.state), null],
      );
      expect(result).toEqual(savedState);
    });

    it('이미 저장된 상태보다 오래된 clientUpdatedAt 요청은 덮어쓰지 않아야 함', async () => {
      const user = new User();
      user.id = 'poke-user';
      const existingState = {
        id: 'state-id',
        userId: user.id,
        user,
        state: {
          marker: 'latest',
        },
        clientUpdatedAt: new Date('2026-07-08T12:00:10.000Z'),
        createdAt: new Date('2026-07-08T12:00:01.000Z'),
        updatedAt: new Date('2026-07-08T12:00:10.000Z'),
      } as GamePokeLoungeState;
      const dto: SavePokeLoungeStateDto = {
        state: {
          marker: 'stale',
        },
        clientUpdatedAt: '2026-07-08T12:00:00.000Z',
      };

      pokeLoungeStateRepository.findOne.mockResolvedValue(existingState);

      const result = await service.savePokeLoungeState(user, dto);

      expect(pokeLoungeStateRepository.query).not.toHaveBeenCalled();
      expect(result).toEqual(existingState);
    });
  });

  describe('findPokeLoungeState', () => {
    it('사용자 id로 Poke Lounge 최신 저장 상태를 조회해야 함', async () => {
      const savedState = {
        id: 'state-id',
        userId: 'poke-user',
        user: { id: 'poke-user' } as User,
        state: {
          room: 'LOUNGE',
        },
        clientUpdatedAt: null,
        createdAt: new Date('2026-07-08T12:00:01.000Z'),
        updatedAt: new Date('2026-07-08T12:00:02.000Z'),
      } as GamePokeLoungeState;

      pokeLoungeStateRepository.findOne.mockResolvedValue(savedState);

      const result = await service.findPokeLoungeState('poke-user');

      expect(pokeLoungeStateRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'poke-user' },
      });
      expect(result).toEqual(savedState);
    });

    it('저장 상태가 없으면 NotFoundException을 던져야 함', async () => {
      pokeLoungeStateRepository.findOne.mockResolvedValue(null);

      await expect(service.findPokeLoungeState('poke-user')).rejects.toThrow(
        'Poke Lounge state not found',
      );
    });
  });
});
