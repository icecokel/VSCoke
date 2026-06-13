import { GoogleAuthGuard } from './google-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ErrorMessage } from '../common/constants/message.constant';

describe('GoogleAuthGuard', () => {
  let guard: GoogleAuthGuard;
  let mockUserRepository;
  let mockClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    delete process.env.ENABLE_DEV_AUTH_BYPASS;
    delete process.env.DEV_AUTH_TOKEN;

    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    guard = new GoogleAuthGuard(mockUserRepository);
    mockClient = {
      verifyIdToken: jest.fn(),
    };
    (guard as any).client = mockClient;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException if no token provided', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(ErrorMessage.AUTH.NO_TOKEN),
      );
    });

    it('should throw UnauthorizedException if email is missing', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid-token' },
          }),
        }),
      } as any;

      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
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
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid-token' },
          }),
        }),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(ErrorMessage.AUTH.INVALID_TOKEN),
      );
    });

    it('should return true and attach user if token and email are valid', async () => {
      const mockRequest: any = {
        headers: { authorization: 'Bearer valid-token' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      const payload = {
        sub: '123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      };

      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: () => payload,
      });

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...payload,
        id: payload.sub,
      });
      mockUserRepository.save.mockResolvedValue({
        ...payload,
        id: payload.sub,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockClient.verifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-token',
        audience: 'test-google-client-id',
      });
      expect(mockRequest['user']).toBeDefined();
      expect(mockRequest['user'].email).toBe(payload.email);
    });

    it('should allow bypass only when explicitly enabled', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      process.env.DEV_AUTH_TOKEN = 'local-dev-token';

      const mockRequest: any = {
        headers: { authorization: 'Bearer local-dev-token' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: 'dev-user-id',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
      });
      mockUserRepository.save.mockResolvedValue({
        id: 'dev-user-id',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockClient.verifyIdToken).not.toHaveBeenCalled();
      expect(mockRequest.user.id).toBe('dev-user-id');
    });
  });
});
