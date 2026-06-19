import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationChannel } from '../constants/notification.constants';
import { NotificationEvent } from '../enums/notification-event.enum';
import type { NotificationPayloads } from '../interfaces/notification-payloads.interface';
import { TEMPLATE_REGISTRY } from '../registry/template.registry';

export interface DeliveryResult {
    emailSent: boolean;
    smsSent: boolean;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    private readonly isEmailEnabled: boolean;
    private readonly isSmsEnabled: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
        private readonly smsService: SmsService,
    ) {
        this.isEmailEnabled = this.configService.get<string>('OTP_EMAIL_ENABLED') === 'true';
        this.isSmsEnabled = this.configService.get<string>('OTP_SMS_ENABLED') === 'true';
    }

    /**
     * Generic dispatch method for all notifications.
     *
     * @param recipient Recipient object with optional email and phone number
     * @param event The notification event to trigger
     * @param payload Strongly-typed payload required for the specific event template
     * @param channels Optional allowlist of channels. If omitted, all globally enabled channels fire.
     */
    async dispatch<T extends NotificationEvent>(
        recipient: { email?: string | null; phoneNumber?: string | null },
        event: T,
        payload: NotificationPayloads[T],
        channels?: NotificationChannel[],
    ): Promise<DeliveryResult> {
        const result: DeliveryResult = { emailSent: false, smsSent: false };

        const isAllowed = (globallyEnabled: boolean, channel: NotificationChannel): boolean => {
            if (!globallyEnabled) return false;
            if (channels && !channels.includes(channel)) {
                this.logger.debug(`[${event}] ${channel.toUpperCase()} skipped — not in allowlist [${channels.join(', ')}]`);
                return false;
            }
            return true;
        };

        const emailAllowed = isAllowed(this.isEmailEnabled, NotificationChannel.EMAIL) && !!recipient.email;
        const smsAllowed = isAllowed(this.isSmsEnabled, NotificationChannel.SMS) && !!recipient.phoneNumber;

        if (!emailAllowed && !smsAllowed) {
            this.logger.warn(`[${event}] No eligible delivery channel for recipient.`);
            return result;
        }

        const templates = TEMPLATE_REGISTRY[event];
        if (!templates) {
            this.logger.error(`[${event}] No templates registered for this event`);
            return result;
        }

        type ChannelJob = { name: NotificationChannel; promise: Promise<void> };
        const jobs: ChannelJob[] = [];

        if (emailAllowed && templates.email) {
            const emailContent = templates.email(payload);
            jobs.push({
                name: NotificationChannel.EMAIL,
                promise: this.emailService.send(recipient.email!, emailContent),
            });
        }

        if (smsAllowed && templates.sms) {
            const smsContent = templates.sms(payload);
            jobs.push({
                name: NotificationChannel.SMS,
                promise: this.smsService.send(recipient.phoneNumber!, smsContent),
            });
        }

        const settlements = await Promise.allSettled(jobs.map(j => j.promise));
        let successCount = 0;

        settlements.forEach((settlement, index) => {
            const channelName = jobs[index].name;

            if (settlement.status === 'fulfilled') {
                successCount++;
                if (channelName === NotificationChannel.EMAIL) result.emailSent = true;
                if (channelName === NotificationChannel.SMS) result.smsSent = true;
            } else {
                const reason = settlement.reason instanceof Error ? settlement.reason.message : String(settlement.reason);
                this.logger.error(`[${event}] ${channelName.toUpperCase()} failed: ${reason}`);
            }
        });

        if (jobs.length > 0 && successCount === 0) {
            throw new AppException('Notification delivery failed on all channels. Please try again later.');
        }

        return result;
    }
}
