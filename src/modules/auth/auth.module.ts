import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { GoogleService } from './services/google.service';
import { TokenService } from './services/token.service';
import { TokenCleanupService } from './services/token-cleanup.service';
import { AuthRepository } from './repositories/auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RedisService } from '../../redis/redis.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    NotificationModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Default secret used for access tokens.
        // TokenService overrides per-call for refresh tokens (different secret).
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    GoogleService,
    TokenService,
    TokenCleanupService,
    AuthRepository,
    RedisService,
    JwtStrategy,
    RefreshTokenStrategy,
    JwtAuthGuard,
    RefreshTokenGuard,
  ],
  exports: [JwtAuthGuard, JwtModule, TokenService],
})
export class AuthModule {}
