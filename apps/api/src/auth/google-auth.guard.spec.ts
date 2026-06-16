import { GoogleAuthGuard } from './google-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ErrorMessage } from '../common/constants/message.constant';

type TestRequest = {
  headers: {
    authorization?: string;
  };
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
    });

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
