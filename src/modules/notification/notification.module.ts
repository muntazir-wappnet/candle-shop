import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { NotificationService } from './services/notification.service';

@Module({
    imports: [ConfigModule],
    providers: [EmailService, SmsService, NotificationService],
    exports: [NotificationService],
})
export class NotificationModule {}
