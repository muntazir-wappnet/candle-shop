import {
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type { Twilio } from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import { INotificationChannel } from '../interfaces/notification-channel.interface';
import { OtpTemplateType } from '../enums/otp-template-type.enum';
import { getRegistrationOtpSmsTemplate } from '../templates/sms/registration-otp.template';
import { getResendOtpSmsTemplate } from '../templates/sms/resend-otp.template';
import { getForgotPasswordOtpSmsTemplate } from '../templates/sms/forgot-password-otp.template';
import { getPasswordChangedSmsTemplate } from '../templates/sms/password-changed.template';
import { getPasswordResetSmsTemplate } from '../templates/sms/password-reset.template';
import {
    getNewLoginSmsTemplate,
    type NewLoginSmsData,
} from '../templates/sms/new-login.template';

// ─── OTP Template Map ─────────────────────────────────────────────────────────

type SmsTemplateFn = (otp: string) => string;

/**
 * Maps OtpTemplateType → template function for OTP-based SMS.
 * NEW_LOGIN is intentionally omitted — it uses sendLoginNotification()
 * because it carries device info, not an OTP string.
 */
const OTP_SMS_TEMPLATES: Partial<Record<OtpTemplateType, SmsTemplateFn>> = {
    [OtpTemplateType.REGISTRATION]: getRegistrationOtpSmsTemplate,
    [OtpTemplateType.RESEND]: getResendOtpSmsTemplate,
    [OtpTemplateType.FORGOT_PASSWORD]: getForgotPasswordOtpSmsTemplate,
    [OtpTemplateType.PASSWORD_CHANGED]: () => getPasswordChangedSmsTemplate(),
    [OtpTemplateType.PASSWORD_RESET]: () => getPasswordResetSmsTemplate(),
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SmsService implements INotificationChannel, OnModuleInit {
    private readonly logger = new Logger(SmsService.name);
    private client!: Twilio;
    private fromNumber!: string;
    private countryCode!: string;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        const accountSid =
            this.configService.get<string>('TWILIO_ACCOUNT_SID') ?? '';
        const authToken =
            this.configService.get<string>('TWILIO_AUTH_TOKEN') ?? '';

        this.fromNumber =
            this.configService.get<string>('TWILIO_FROM_NUMBER') ?? '';
        this.countryCode =
            this.configService.get<string>('TWILIO_DEFAULT_COUNTRY_CODE') ??
            '+91';

        if (!accountSid || !authToken) {
            this.logger.warn(
                'Twilio credentials are not configured. SMS delivery will fail until credentials are set.',
            );
            return;
        }

        this.client = twilio(accountSid, authToken);
        this.logger.log('Twilio SMS client initialised successfully');
    }

    // ─── OTP SMS ──────────────────────────────────────────────────────────────

    async sendOtp(phoneNumber: string, otp: string, templateType: OtpTemplateType): Promise<void> {
        if (!this.client) {
            throw new Error(
                'Twilio client is not initialised. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
            );
        }

        const e164Number = this.toE164(phoneNumber);

        const templateFn = OTP_SMS_TEMPLATES[templateType];
        if (!templateFn) {
            throw new Error(`Unsupported OTP template type: ${templateType as string}`);
        }
        const body = templateFn(otp);

        await this.sendSms(e164Number, body, templateType);
    }

    // ─── New Login Notification ───────────────────────────────────────────────

    /**
     * Sends a new-login SMS alert with device information.
     *
     * NOTE: This method is implemented and ready, but the SMS channel is
     * intentionally NOT enabled for new login alerts (email-only by default).
     *
     * To enable SMS login alerts, update sendLoginNotification() in
     * NotificationService to include NotificationChannel.SMS in the
     * channels array for this call.
     */
    async sendLoginNotification(
        phoneNumber: string,
        data: NewLoginSmsData,
    ): Promise<void> {
        if (!this.client) {
            throw new Error(
                'Twilio client is not initialised. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
            );
        }

        const e164Number = this.toE164(phoneNumber);
        const body = getNewLoginSmsTemplate(data);

        await this.sendSms(e164Number, body, OtpTemplateType.NEW_LOGIN);
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Shared SMS delivery logic used by both sendOtp() and sendLoginNotification().
     */
    private async sendSms(
        e164Number: string,
        body: string,
        templateType: OtpTemplateType,
    ): Promise<void> {
        let message: MessageInstance;

        try {
            message = await this.client.messages.create({
                body,
                from: this.fromNumber,
                to: e164Number,
            });
        } catch (error: unknown) {
            const twilioError = error as { code?: number; message?: string };
            const errorMessage = this.resolveTwilioError(twilioError);

            this.logger.error(
                `Failed to send SMS to ${e164Number} — Code: ${twilioError.code ?? 'N/A'} — ${errorMessage}`,
            );
            throw new Error(errorMessage);
        }

        this.logger.log(
            `SMS sent to ${e164Number} using ${templateType} template — SID: ${message.sid} — Status: ${message.status}`,
        );
    }

    /**
     * Converts a 10-digit local number to E.164 format.
     * If the number already starts with '+', it is returned as-is.
     */
    private toE164(phoneNumber: string): string {
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }
        return `${this.countryCode}${phoneNumber}`;
    }

    /**
     * Maps common Twilio error codes to user-friendly messages.
     * See: https://www.twilio.com/docs/api/errors
     */
    private resolveTwilioError(error: {
        code?: number;
        message?: string;
    }): string {
        const knownCodes: Record<number, string> = {
            21211: 'The provided phone number is invalid.',
            21214: 'The destination phone number is not reachable.',
            21408: 'Permission to send SMS to this region is not enabled.',
            21610: 'The recipient has opted out of receiving messages.',
            21614: 'The destination number is not capable of receiving SMS.',
            21617: 'The concatenated message body exceeds the maximum length.',
            30003: 'SMS delivery failed — handset unreachable.',
            30004: 'SMS delivery failed — message blocked.',
            30005: 'SMS delivery failed — unknown destination.',
            30006: 'SMS delivery failed — landline or unreachable carrier.',
            30007: 'SMS delivery failed — carrier violation.',
            30008: 'SMS delivery failed — unknown error from carrier.',
        };

        if (error.code && knownCodes[error.code]) {
            return knownCodes[error.code];
        }

        return error.message ?? 'An unexpected error occurred while sending SMS.';
    }
}
