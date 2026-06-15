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
import { OTP_EXPIRY_MINUTES } from '../constants/notification.constants';

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

    async sendOtp(phoneNumber: string, otp: string): Promise<void> {
        if (!this.client) {
            throw new Error(
                'Twilio client is not initialised. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
            );
        }

        const e164Number = this.toE164(phoneNumber);
        const body = `Your Candle Shop verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone.`;

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
                `Failed to send OTP SMS to ${e164Number} — Code: ${twilioError.code ?? 'N/A'} — ${errorMessage}`,
            );
            throw new Error(errorMessage);
        }

        this.logger.log(
            `OTP SMS sent to ${e164Number} — SID: ${message.sid} — Status: ${message.status}`,
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
