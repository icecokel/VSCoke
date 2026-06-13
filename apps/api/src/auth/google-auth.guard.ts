import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ErrorMessage } from '../common/constants/message.constant';

/**
 * 구글 ID 토큰을 검증하고 사용자를 인증하는 가드
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private client = new OAuth2Client();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 요청을 가로채어 구글 토큰의 유효성을 검사함
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    // 토큰이 없는 경우 예외 발생
    if (!token) {
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
      // 더미 유저 생성 또는 조회
      const devUserId = 'dev-user-id';
      let user = await this.userRepository.findOne({
        where: { id: devUserId },
      });

      if (!user) {
        user = this.userRepository.create({
          id: devUserId,
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
        });
        await this.userRepository.save(user);
      }

      request['user'] = user;
      return true;
    }

    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new UnauthorizedException(ErrorMessage.AUTH.INVALID_TOKEN);
      }

      // 구글 클라이언트를 사용하여 토큰 검증 (audience 강제)
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException(ErrorMessage.AUTH.INVALID_TOKEN);
      }

      const { email, given_name, family_name, sub } = payload;

      if (!email) {
        throw new UnauthorizedException(ErrorMessage.AUTH.EMAIL_REQUIRED);
      }

      // 사용자 조회 또는 생성 (Upsert 로직)
      let user = await this.userRepository.findOne({ where: { id: sub } });

      if (!user) {
        user = this.userRepository.create({
          id: sub, // Google ID(sub)를 서버의 고유 ID로 사용
          email: email,
          firstName: given_name || '',
          lastName: family_name || '',
        });
        await this.userRepository.save(user);
      } else {
        // 기존 사용자의 정보 업데이트가 필요한 경우 여기에 추가 로직 작성 가능
      }

      // 요청 객체에 유저 정보 첨부
      request['user'] = user;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }

      throw new UnauthorizedException(
        `${ErrorMessage.AUTH.INVALID_TOKEN}: ${e.message}`,
      );
    }
  }

  /**
   * Authorization 헤더에서 Bearer 토큰을 추출함
   */
  private extractTokenFromHeader(request: any): string | undefined {
    // request['headers']가 아닌 원본 인터페이스를 준수하도록 any 타입 사용 (추후 구체화 가능)
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
