import { GoogleAuthGuard } from './google-auth.guard';
import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ErrorMessage } from '../common/constants/message.constant';

type TestRequest = {
  body?: unknown;
  headers: {
    authorization?: string;
  };
  method?: string;
  path?: string;
  user?: User;
};

type MockUserRepository = {
  findOne: jest.Mock<Promise<User | null>, [unknown]>;
  save: jest.Mock<Promise<User>, [User]>;
  create: jest.Mock<User, [Partial<User>]>;
};

type MockLoginTicket = Pick<LoginTicket, 'getPayload'>;

type MockGoogleClient = {
  verifyIdToken: jest.Mock<
    Promise<MockLoginTicket>,
    [Parameters<OAuth2Client['verifyIdToken']>[0]]
  >;
};

const numberMatcher: unknown = expect.any(Number);
let logSpy: jest.SpiedFunction<Logger['log']>;
let debugSpy: jest.SpiedFunction<Logger['debug']>;
let warnSpy: jest.SpiedFunction<Logger['warn']>;

const createExecutionContext = (request: TestRequest): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: <T = TestRequest>() => request as T,
    }),
  }) as ExecutionContext;

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  accessToken: '',
  ...overrides,
});

describe('GoogleAuthGuard', () => {
  let guard: GoogleAuthGuard;
  let mockUserRepository: MockUserRepository;
  let mockClient: MockGoogleClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    delete process.env.ENABLE_DEV_AUTH_BYPASS;
    delete process.env.DEV_AUTH_TOKEN;

    mockUserRepository = {
      findOne: jest.fn<Promise<User | null>, [unknown]>(),
      save: jest.fn<Promise<User>, [User]>(),
      create: jest.fn<User, [Partial<User>]>(),
    };
    guard = new GoogleAuthGuard(
      mockUserRepository as unknown as Repository<User>,
    );
    mockClient = {
      verifyIdToken: jest.fn<
        Promise<MockLoginTicket>,
        [Parameters<OAuth2Client['verifyIdToken']>[0]]
      >(),
    };
    (guard as unknown as { client: MockGoogleClient }).client = mockClient;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException if no token provided', async () => {
      const context = createExecutionContext({
        headers: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(ErrorMessage.AUTH.NO_TOKEN),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.authentication',
          outcome: 'rejected',
          stage: 'token',
        }),
      );
    });

    it('should throw UnauthorizedException if email is missing', async () => {
      const context = createExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: (): TokenPayload => ({
          sub: '123',
          // email missing
        }),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(ErrorMessage.AUTH.EMAIL_REQUIRED),
      );
    });

    it('should throw UnauthorizedException when GOOGLE_CLIENT_ID is missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const context = createExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(ErrorMessage.AUTH.INVALID_TOKEN),
      );
    });

    it('should return true and attach user if token and email are valid', async () => {
      const mockRequest: TestRequest = {
        headers: { authorization: 'Bearer valid-token' },
      };
      const context = createExecutionContext(mockRequest);

      const payload: TokenPayload = {
        sub: '123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      };

      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: () => payload,
      });

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(
        createUser({
          id: payload.sub,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
        }),
      );
      mockUserRepository.save.mockResolvedValue(
        createUser({
          id: payload.sub,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
        }),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockClient.verifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-token',
        audience: 'test-google-client-id',
      });
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.email).toBe(payload.email);
      expect(logSpy).toHaveBeenCalledWith({
        event: 'auth.user',
        outcome: 'created',
      });
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.authentication',
          provider: 'google',
          outcome: 'authenticated',
          durationMs: numberMatcher,
        }),
      );
      const logs = JSON.stringify([logSpy.mock.calls, debugSpy.mock.calls]);
      expect(logs).not.toContain(payload.email);
      expect(logs).not.toContain('valid-token');
      expect(logs).not.toContain('test-google-client-id');
    });

    it('실패 단계와 소요 시간만 남기고 Google 오류의 인증 정보는 기록하지 않는다', async () => {
      mockClient.verifyIdToken.mockRejectedValue(
        new Error('provider-secret-token user@example.com'),
      );

      await expect(
        guard.canActivate(
          createExecutionContext({
            headers: { authorization: 'Bearer private-token' },
          }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(warnSpy).toHaveBeenCalledWith({
        event: 'auth.authentication',
        provider: 'google',
        outcome: 'failed',
        stage: 'verification',
        durationMs: numberMatcher,
      });
      expect(JSON.stringify(warnSpy.mock.calls)).not.toMatch(
        /private-token|provider-secret-token|user@example.com/,
      );
    });

    it('should reuse a user inserted by a concurrent request', async () => {
      const request: TestRequest = {
        headers: { authorization: 'Bearer valid-token' },
      };
      const concurrentUser = createUser({ id: '123' });
      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: (): TokenPayload => ({
          sub: concurrentUser.id,
          email: concurrentUser.email,
        }),
      });
      mockUserRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(concurrentUser);
      mockUserRepository.create.mockReturnValue(concurrentUser);
      mockUserRepository.save.mockRejectedValue(
        databaseFailure('23505', 'duplicate key'),
      );

      await expect(
        guard.canActivate(createExecutionContext(request)),
      ).resolves.toBe(true);
      expect(request.user).toBe(concurrentUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it.each([
      {
        caseName: 'the concurrent user is still missing',
        saveError: databaseFailure('23505', 'duplicate key'),
        findResults: [null, null],
      },
      {
        caseName: 'the database failure is not a unique violation',
        saveError: databaseFailure('08006', 'connection failure'),
        findResults: [null],
      },
    ])(
      'should surface the insert failure when $caseName',
      async ({ saveError, findResults }) => {
        const request: TestRequest = {
          headers: { authorization: 'Bearer valid-token' },
        };
        const candidate = createUser({ id: '123' });
        mockClient.verifyIdToken.mockResolvedValue({
          getPayload: (): TokenPayload => ({
            sub: candidate.id,
            email: candidate.email,
          }),
        });
        for (const result of findResults) {
          mockUserRepository.findOne.mockResolvedValueOnce(result);
        }
        mockUserRepository.create.mockReturnValue(candidate);
        mockUserRepository.save.mockRejectedValue(saveError);

        await expect(
          guard.canActivate(createExecutionContext(request)),
        ).rejects.toThrow(saveError.message);
        expect(mockUserRepository.findOne).toHaveBeenCalledTimes(
          findResults.length,
        );
        expect(request.user).toBeUndefined();
      },
    );

    it('should allow bypass only when explicitly enabled', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      process.env.DEV_AUTH_TOKEN = 'local-dev-token';

      const mockRequest: TestRequest = {
        headers: { authorization: 'Bearer local-dev-token' },
      };
      const context = createExecutionContext(mockRequest);

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(
        createUser({
          id: 'dev-user-id',
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
        }),
      );
      mockUserRepository.save.mockResolvedValue(
        createUser({
          id: 'dev-user-id',
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
        }),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockClient.verifyIdToken).not.toHaveBeenCalled();
      expect(mockRequest.user?.id).toBe('dev-user-id');
    });
  });
});

function databaseFailure(code: string, message: string): QueryFailedError {
  const driverError = Object.assign(new Error(message), {
    code,
  });

  return new QueryFailedError('INSERT', [], driverError);
}
