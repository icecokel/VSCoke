import { Test, TestingModule } from '@nestjs/testing';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import {
  ExecutionContext,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GameHistoryResponseDto } from './dto/game-history-response.dto';
import { GameType } from './enums/game-type.enum';

const mockGameService = () => ({
  createHistory: jest.fn(),
  getRanking: jest.fn(),
  findHistoryById: jest.fn(),
  getUserRank: jest.fn(),
  getUserBestScore: jest.fn(),
});

describe('GameController', () => {
  let controller: GameController;
  let service: ReturnType<typeof mockGameService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useFactory: mockGameService,
        },
      ],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user' };
          return true;
        },
      })
      .compile();

    controller = module.get<GameController>(GameController);
    service = module.get(GameService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createResult', () => {
    it('should create a game result', async () => {
      const dto: CreateGameHistoryDto = {
        score: 100,
        gameType: GameType.SKY_DROP,
      };
      const req = {
        user: { id: 'test-user', firstName: 'Gil', lastName: 'Dong' },
      };
      const createdHistory = {
        id: '1',
        ...dto,
        user: req.user,
        createdAt: new Date(),
      };

      const expectedResult = {
        id: createdHistory.id,
        score: createdHistory.score,
        gameType: createdHistory.gameType,
        createdAt: createdHistory.createdAt,
        user: {
          displayName: 'Gil Dong',
        },
        rank: 1,
        bestScore: 200,
        allTimeRank: 1,
        weeklyRank: 1,
      };

      service.createHistory.mockResolvedValue(createdHistory as any);
      service.getUserRank
        .mockResolvedValueOnce(1) // allTimeRank
        .mockResolvedValueOnce(1) // weeklyRank
        .mockResolvedValueOnce(1); // currentRank
      service.getUserBestScore
        .mockResolvedValueOnce(200) // bestScore
        .mockResolvedValueOnce(200); // weeklyBestScore

      const result = await controller.createResult(req, dto);

      expect(service.createHistory).toHaveBeenCalledWith(req.user, dto);
      expect(service.getUserBestScore).toHaveBeenCalledTimes(2);
      expect(service.getUserRank).toHaveBeenCalledTimes(3);
      expect(result).toEqual(expectedResult);
    });

    it('should create a game result with playTime', async () => {
      const dto: CreateGameHistoryDto = {
        score: 200,
        gameType: GameType.SKY_DROP,
        playTime: 120,
      };
      const req = {
        user: { id: 'test-user', firstName: 'Gil', lastName: 'Dong' },
      };
      const createdHistory = {
        id: '2',
        ...dto,
        user: req.user,
        createdAt: new Date(),
      };

      const expectedResult: GameHistoryResponseDto = {
        id: createdHistory.id,
        score: createdHistory.score,
        gameType: createdHistory.gameType,
        createdAt: createdHistory.createdAt,
        user: {
          displayName: 'Gil Dong',
        },
        rank: 5,
        bestScore: 200,
        allTimeRank: 5,
        weeklyRank: 5,
      };

      service.createHistory.mockResolvedValue(createdHistory as any);
      service.getUserRank.mockResolvedValue(5);
      service.getUserBestScore.mockResolvedValue(200);

      const result = await controller.createResult(req, dto);

      expect(service.createHistory).toHaveBeenCalledWith(req.user, dto);
      expect(result).toEqual(expectedResult);
    });

    // Failure Case 1: Service throws an error (e.g., DB error)
    it('should throw InternalServerErrorException if service fails', async () => {
      const dto: CreateGameHistoryDto = {
        score: 100,
        gameType: GameType.SKY_DROP,
      };
      const req = {
        user: { id: 'test-user', firstName: 'Gil', lastName: 'Dong' },
      };

      service.createHistory.mockRejectedValue(new Error('DB Error'));
      // service.getUserRank.mockResolvedValue(1); // Not reached

      await expect(controller.createResult(req, dto)).rejects.toThrow(
        'DB Error',
      );
    });

    // Failure Case 2: DTO validation failure simulation (Mocking bad input reaching logic if DTO passed)
    // Note: DTO validation happens before controller, but logic might fail on business rules in service
    it('should propagate service error for invalid logic', async () => {
      const dto: CreateGameHistoryDto = {
        score: -50, // Assuming negative score is allowed by DTO but rejected by Service logic
        gameType: GameType.SKY_DROP,
      };
      const req = { user: { id: 'test-user' } };

      service.createHistory.mockRejectedValue(
        new BadRequestException('Invalid Score'),
      );
      // service.getUserRank.mockResolvedValue(1); // Not reached

      await expect(controller.createResult(req, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getRanking', () => {
    it('should return ranking list for required gameType', async () => {
      const expectedResult = [{ score: 100, gameType: GameType.SKY_DROP }];
      service.getRanking.mockResolvedValue(expectedResult);

      const result = await controller.getRanking(GameType.SKY_DROP);

      expect(service.getRanking).toHaveBeenCalledWith(GameType.SKY_DROP);
      expect(result).toEqual(expectedResult);
    });

    it('should return ranking list filtered by gameType', async () => {
      const expectedResult = [{ score: 200, gameType: GameType.SKY_DROP }];
      service.getRanking.mockResolvedValue(expectedResult);

      const result = await controller.getRanking(GameType.SKY_DROP);

      expect(service.getRanking).toHaveBeenCalledWith(GameType.SKY_DROP);
      expect(result).toEqual(expectedResult);
    });

    // Failure Case 1: Service throws error
    it('should throw error if service fails to get ranking', async () => {
      service.getRanking.mockRejectedValue(
        new InternalServerErrorException('DB Connection Fail'),
      );
      await expect(controller.getRanking(GameType.SKY_DROP)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    // Success Case 2 (Implicitly failure check for empty data): Should return empty array if no data
    it('should return empty array if no ranking data exists', async () => {
      service.getRanking.mockResolvedValue([]);
      const result = await controller.getRanking(GameType.SKY_DROP);
      expect(result).toEqual([]);
    });
  });

  describe('getGameResult', () => {
    // Success Case 1
    it('should return game result by id', async () => {
      const id = 'test-uuid';
      const history = {
        id,
        score: 100,
        gameType: GameType.SKY_DROP,
        createdAt: new Date(),
        user: { firstName: 'Gil', lastName: 'Dong' },
      };
      const expectedResult = {
        id: history.id,
        score: history.score,
        gameType: history.gameType,
        createdAt: history.createdAt,
        user: { displayName: 'Gil Dong' },
      };

      service.findHistoryById.mockResolvedValue(history as any);

      const result = await controller.getGameResult(id);

      expect(service.findHistoryById).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });

    // Success Case 2: Formatting check (checking displayName concatenation again)
    it('should correctly format displayName in response', async () => {
      const id = 'another-uuid';
      const history = {
        id,
        score: 200,
        gameType: GameType.SKY_DROP,
        createdAt: new Date(),
        user: { firstName: 'Hong', lastName: 'Gildong' },
      };

      service.findHistoryById.mockResolvedValue(history as any);

      const result = await controller.getGameResult(id);

      expect(result.user.displayName).toBe('Hong Gildong');
    });

    // Failure Case 1: ID not found (Service throws NotFoundException)
    it('should throw NotFoundException if id not found', async () => {
      const id = 'invalid-uuid';
      service.findHistoryById.mockRejectedValue(
        new NotFoundException('Game history not found'),
      );

      await expect(controller.getGameResult(id)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Failure Case 2: Internal Server Error (DB Error)
    it('should throw InternalServerErrorException on DB error', async () => {
      const id = 'error-uuid';
      service.findHistoryById.mockRejectedValue(
        new InternalServerErrorException('DB Error'),
      );

      await expect(controller.getGameResult(id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    // Failure Case 3: BadRequest (Invalid UUID format simulation)
    it('should throw BadRequestException for invalid UUID format', async () => {
      const id = 'not-a-uuid';
      service.findHistoryById.mockRejectedValue(
        new BadRequestException('Invalid UUID'),
      );

      await expect(controller.getGameResult(id)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Failure Case 4: Unknown Error
    it('should propagate unknown errors', async () => {
      const id = 'unknown-error-uuid';
      service.findHistoryById.mockRejectedValue(new Error('Unknown Error'));

      await expect(controller.getGameResult(id)).rejects.toThrow(
        'Unknown Error',
      );
    });
  });
});
