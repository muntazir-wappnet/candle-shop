import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { OtpService } from './services/otp.service';
import { AuthService } from './services/auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { RedisService } from '../../redis/redis.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    AuthRepository,
    RedisService,
  ],
})
export class AuthModule {}
