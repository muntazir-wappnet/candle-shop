import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationChannel } from '../constants/notification.constants';

export interface OtpDeliveryResult {
    emailSent: boolean;
    smsSent: boolean;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    /** Master on/off switches read from env at startup. */
    private readonly isEmailEnabled: boolean;
    private readonly isSmsEnabled: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
        private readonly smsService: SmsService,
    ) {
        this.isEmailEnabled =
            this.configService.get<string>('OTP_EMAIL_ENABLED') === 'true';
        this.isSmsEnabled =
            this.configService.get<string>('OTP_SMS_ENABLED') === 'true';
    }

    /**
     * Sends an OTP via the eligible delivery channels concurrently.
     *
     * A channel is eligible only when BOTH conditions are true:
     *   1. Its global env-var toggle is `true`  (master switch)
     *   2. It appears in the `channels` allowlist (call-site restriction)
     *
     * When `channels` is omitted, all globally-enabled channels fire
     * (backward-compatible with the original behaviour).
     *
     * @param email       Recipient email address
     * @param phoneNumber Recipient phone number (10-digit local format)
     * @param otp         One-time password to deliver
     * @param channels    Optional allowlist — pass to restrict which channels
     *                    this specific call may use. When provided, only channels
     *                    present in this array AND globally enabled will fire.
     *
     * @example
     *   // OTP registration — SMS only (blocks temp-email abuse)
     *   await notificationService.sendOtp(email, phone, otp, [NotificationChannel.SMS]);
     *
     *   // Password-reset alert — both channels
     *   await notificationService.sendOtp(email, phone, otp, [NotificationChannel.EMAIL, NotificationChannel.SMS]);
     *
     *   // No per-call restriction — respects global toggles only
     *   await notificationService.sendOtp(email, phone, otp);
     */
    async sendOtp(
        email: string,
        phoneNumber: string,
        otp: string,
        channels?: NotificationChannel[],
    ): Promise<OtpDeliveryResult> {
        const result: OtpDeliveryResult = {
            emailSent: false,
            smsSent: false,
        };

        /**
         * Determines whether a channel is allowed to fire.
         * Two-gate logic:
         *   Gate 1 — global toggle (env var)
         *   Gate 2 — call-site allowlist (when provided)
         */
        const isAllowed = (
            globallyEnabled: boolean,
            channel: NotificationChannel,
        ): boolean => {
            if (!globallyEnabled) return false;
            if (channels && !channels.includes(channel)) {
                this.logger.debug(
                    `[OTP] ${channel.toUpperCase()} channel skipped for ${email} — ` +
                    `not in the call-site allowlist [${channels.join(', ')}]`,
                );
                return false;
            }
            return true;
        };

        const emailAllowed = isAllowed(this.isEmailEnabled, NotificationChannel.EMAIL);
        const smsAllowed   = isAllowed(this.isSmsEnabled,   NotificationChannel.SMS);

        if (!emailAllowed && !smsAllowed) {
            this.logger.warn(
                `[OTP] No eligible delivery channel for ${email}. ` +
                `Global — email:${this.isEmailEnabled} sms:${this.isSmsEnabled}. ` +
                (channels
                    ? `Call-site allowlist: [${channels.join(', ')}].`
                    : 'No call-site restriction set.'),
            );
            return result;
        }

        type ChannelJob = {
            name: NotificationChannel;
            promise: Promise<void>;
        };

        const jobs: ChannelJob[] = [];

        if (emailAllowed) {
            jobs.push({
                name: NotificationChannel.EMAIL,
                promise: this.emailService.sendOtp(email, otp),
            });
        }

        if (smsAllowed) {
            jobs.push({
                name: NotificationChannel.SMS,
                promise: this.smsService.sendOtp(phoneNumber, otp),
            });
        }

        const settlements = await Promise.allSettled(
            jobs.map((j) => j.promise),
        );

        let successCount = 0;

        settlements.forEach((settlement, index) => {
            const channelName = jobs[index].name;

            if (settlement.status === 'fulfilled') {
                successCount++;
                if (channelName === NotificationChannel.EMAIL) result.emailSent = true;
                if (channelName === NotificationChannel.SMS)   result.smsSent   = true;
            } else {
                const reason =
                    settlement.reason instanceof Error
                        ? settlement.reason.message
                        : String(settlement.reason);

                this.logger.error(
                    `[OTP] ${channelName.toUpperCase()} channel failed for ${email}: ${reason}`,
                );
            }
        });

        if (successCount === 0) {
            throw new AppException(
                'OTP delivery failed on all channels. Please try again later.',
            );
        }

        return result;
    }
}

