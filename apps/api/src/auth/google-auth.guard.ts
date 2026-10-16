import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Request } from 'express';
import { User } from './entities/user.entity';
import { ErrorMessage } from '../common/constants/message.constant';

type AuthenticatedRequest = Request & { user?: User };
type UserProfile = Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;

/**
 * 구글 ID 토큰을 검증하고 사용자를 인증하는 가드
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly client: OAuth2Client = new OAuth2Client();
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 요청을 가로채어 구글 토큰의 유효성을 검사함
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const startedAt = performance.now();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    // 토큰이 없는 경우 예외 발생
    if (!token) {
      this.logger.warn({
        event: 'auth.authentication',
        outcome: 'rejected',
        stage: 'token',
        durationMs: performance.now() - startedAt,
      });
      throw new UnauthorizedException(ErrorMessage.AUTH.NO_TOKEN);
    }

    // 개발 환경 인증 우회 로직 (명시적으로 활성화된 경우에만 허용)
    const isNonProduction = process.env.NODE_ENV !== 'production';
    const isDevBypassEnabled = process.env.ENABLE_DEV_AUTH_BYPASS === 'true';
    const devAuthToken = process.env.DEV_AUTH_TOKEN;

    if (
      isNonProduction &&
      isDevBypassEnabled &&
      devAuthToken &&
      token === devAuthToken
    ) {
      try {
        request.user = await this.findOrCreateUser({
          id: 'dev-user-id',
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
        });
      } catch (error) {
        this.logger.error({
          event: 'auth.authentication',
          provider: 'development',
          outcome: 'failed',
          stage: 'persistence',
          durationMs: performance.now() - startedAt,
        });
        throw error;
      }
      this.logger.warn({
        event: 'auth.authentication',
        provider: 'development',
        outcome: 'authenticated',
        durationMs: performance.now() - startedAt,
      });
      return true;
    }

    let stage = 'configuration';
    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new UnauthorizedException(ErrorMessage.AUTH.INVALID_TOKEN);
      }

      // 구글 클라이언트를 사용하여 토큰 검증 (audience 강제)
      stage = 'verification';
      const verificationStartedAt = performance.now();
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: googleClientId,
      });
      this.logger.debug({
        event: 'auth.google-verification',
        outcome: 'completed',
        durationMs: performance.now() - verificationStartedAt,
      });
      stage = 'profile';
      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException(ErrorMessage.AUTH.INVALID_TOKEN);
      }

      const { email, given_name, family_name, sub } = payload;

      if (!email) {
        throw new UnauthorizedException(ErrorMessage.AUTH.EMAIL_REQUIRED);
      }

      stage = 'persistence';
      const user = await this.findOrCreateUser({
        id: sub,
        email,
        firstName: given_name || '',
        lastName: family_name || '',
      });

      // 요청 객체에 유저 정보 첨부
      request.user = user;
      this.logger.log({
        event: 'auth.authentication',
        provider: 'google',
        outcome: 'authenticated',
        durationMs: performance.now() - startedAt,
      });
      return true;
    } catch (e) {
      const log = {
        event: 'auth.authentication',
        provider: 'google',
        outcome: e instanceof UnauthorizedException ? 'rejected' : 'failed',
        stage,
        durationMs: performance.now() - startedAt,
      };
      if (e instanceof UnauthorizedException || stage === 'verification') {
        this.logger.warn(log);
      } else {
        this.logger.error(log);
      }
      if (e instanceof UnauthorizedException || stage === 'persistence') {
        throw e;
      }

      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new UnauthorizedException(
        `${ErrorMessage.AUTH.INVALID_TOKEN}: ${errorMessage}`,
      );
    }
  }

  private async findOrCreateUser(profile: UserProfile): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { id: profile.id },
    });

    if (existingUser) {
      this.logger.debug({ event: 'auth.user', outcome: 'existing' });
      return existingUser;
    }

    const user = this.userRepository.create(profile);
    try {
      const createdUser = await this.userRepository.save(user);
      this.logger.log({ event: 'auth.user', outcome: 'created' });
      return createdUser;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const concurrentlyCreatedUser = await this.userRepository.findOne({
        where: { id: profile.id },
      });
      if (!concurrentlyCreatedUser) {
        throw error;
      }

      this.logger.debug({
        event: 'auth.user',
        outcome: 'concurrently-created',
      });
      return concurrentlyCreatedUser;
    }
  }

  /**
   * Authorization 헤더에서 Bearer 토큰을 추출함
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string };
  return driverError.code === '23505';
}
