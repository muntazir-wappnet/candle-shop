import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationChannel } from '../constants/notification.constants';
import { OtpTemplateType } from '../enums/otp-template-type.enum';
import type { NewLoginEmailData } from '../templates/email/new-login.template';
import type { NewLoginSmsData } from '../templates/sms/new-login.template';

export interface OtpDeliveryResult {
    emailSent: boolean;
    smsSent: boolean;
}

export interface LoginNotificationData {
    deviceName: string | null;
    deviceType: string;
    ipAddress: string | null;
    time: string;
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
     * @param templateType Template to render
     * @param channels    Optional allowlist — pass to restrict which channels
     *                    this specific call may use. When provided, only channels
     *                    present in this array AND globally enabled will fire.
     */
    async sendOtp(
        email: string,
        phoneNumber: string,
        otp: string,
        templateType: OtpTemplateType,
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

        const emailAllowed = isAllowed(this.isEmailEnabled, NotificationChannel.EMAIL) && !!email;
        const smsAllowed   = isAllowed(this.isSmsEnabled,   NotificationChannel.SMS) && !!phoneNumber;

        if (!emailAllowed && !smsAllowed) {
            this.logger.warn(
                `[OTP] No eligible delivery channel for ${email || 'unknown'}. ` +
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
                promise: this.emailService.sendOtp(email, otp, templateType),
            });
        }

        if (smsAllowed) {
            jobs.push({
                name: NotificationChannel.SMS,
                promise: this.smsService.sendOtp(phoneNumber, otp, templateType),
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
                    `[OTP] ${channelName.toUpperCase()} channel failed for ${email || 'unknown'}: ${reason}`,
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

    // ─── New Login Notification ───────────────────────────────────────────────

    /**
     * Sends a security alert when a new login is detected on the account.
     *
     * Uses the same two-gate channel control as sendOtp():
     *   Gate 1 — global env-var toggle (OTP_EMAIL_ENABLED / OTP_SMS_ENABLED)
     *   Gate 2 — call-site `channels` allowlist (when provided)
     *
     * Current call-site sends EMAIL only:
     *   sendLoginNotification(email, phone, data, [NotificationChannel.EMAIL])
     *
     * To add SMS in the future, just update the call-site to:
     *   sendLoginNotification(email, phone, data, [NotificationChannel.EMAIL, NotificationChannel.SMS])
     *
     * This method is intentionally fire-and-forget — caller should .catch()
     * errors so a notification failure never blocks the login response.
     *
     * @param email       Recipient email
     * @param phoneNumber Recipient phone (used when SMS channel is passed)
     * @param data        Device info captured at login time
     * @param channels    Optional allowlist — same semantics as sendOtp()
     */
    async sendLoginNotification(
        email: string,
        phoneNumber: string | null,
        data: LoginNotificationData,
        channels?: NotificationChannel[],
    ): Promise<void> {
        const isAllowed = (
            globallyEnabled: boolean,
            channel: NotificationChannel,
        ): boolean => {
            if (!globallyEnabled) return false;
            if (channels && !channels.includes(channel)) {
                this.logger.debug(
                    `[LoginNotification] ${channel.toUpperCase()} skipped for ${email} — ` +
                    `not in allowlist [${channels.join(', ')}]`,
                );
                return false;
            }
            return true;
        };

        const emailAllowed = isAllowed(this.isEmailEnabled, NotificationChannel.EMAIL) && !!email;
        const smsAllowed   = isAllowed(this.isSmsEnabled,   NotificationChannel.SMS)   && !!phoneNumber;

        if (!emailAllowed && !smsAllowed) {
            this.logger.warn(
                `[LoginNotification] No eligible channel for ${email}. ` +
                `Global — email:${this.isEmailEnabled} sms:${this.isSmsEnabled}. ` +
                (channels
                    ? `Call-site allowlist: [${channels.join(', ')}].`
                    : 'No call-site restriction set.'),
            );
            return;
        }

        const jobs: Promise<void>[] = [];

        if (emailAllowed) {
            const emailData: NewLoginEmailData = {
                deviceName: data.deviceName,
                deviceType: data.deviceType,
                ipAddress: data.ipAddress,
                time: data.time,
            };
            jobs.push(this.emailService.sendLoginNotification(email, emailData));
        }

        if (smsAllowed) {
            const smsData: NewLoginSmsData = {
                deviceName: data.deviceName,
                ipAddress: data.ipAddress,
                time: data.time,
            };
            jobs.push(this.smsService.sendLoginNotification(phoneNumber!, smsData));
        }

        const results = await Promise.allSettled(jobs);

        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                const reason =
                    result.reason instanceof Error
                        ? result.reason.message
                        : String(result.reason);
                this.logger.error(
                    `[LoginNotification] Channel ${i} failed for ${email}: ${reason}`,
                );
            }
        });
    }
}
