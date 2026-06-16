import {
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { INotificationChannel } from '../interfaces/notification-channel.interface';
import { OtpTemplateType } from '../enums/otp-template-type.enum';
import { getRegistrationOtpEmailTemplate } from '../templates/email/registration-otp.template';
import { getResendOtpEmailTemplate } from '../templates/email/resend-otp.template';
import { getForgotPasswordOtpEmailTemplate } from '../templates/email/forgot-password-otp.template';
import { getPasswordChangedEmailTemplate } from '../templates/email/password-changed.template';
import { getPasswordResetEmailTemplate } from '../templates/email/password-reset.template';
import {
    getNewLoginEmailTemplate,
    type NewLoginEmailData,
} from '../templates/email/new-login.template';

// ─── OTP Template Map ─────────────────────────────────────────────────────────

type EmailTemplateFn = (otp: string) => { subject: string; html: string; text: string };

/**
 * Maps OtpTemplateType → template function for otp-based notifications.
 * NEW_LOGIN is intentionally omitted here — it uses its own sendLoginNotification()
 * method because it has a different data shape (device info, not an OTP).
 */
const OTP_EMAIL_TEMPLATES: Partial<Record<OtpTemplateType, EmailTemplateFn>> = {
    [OtpTemplateType.REGISTRATION]: getRegistrationOtpEmailTemplate,
    [OtpTemplateType.RESEND]: getResendOtpEmailTemplate,
    [OtpTemplateType.FORGOT_PASSWORD]: getForgotPasswordOtpEmailTemplate,
    [OtpTemplateType.PASSWORD_CHANGED]: () => getPasswordChangedEmailTemplate(),
    [OtpTemplateType.PASSWORD_RESET]: () => getPasswordResetEmailTemplate(),
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService implements INotificationChannel, OnModuleInit {
    private readonly logger = new Logger(EmailService.name);
    private transporter!: Transporter;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit(): Promise<void> {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT'),
            secure:
                this.configService.get<string>('SMTP_SECURE') === 'true',
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });

        try {
            await this.transporter.verify();
            this.logger.log('SMTP connection established successfully');
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            this.logger.warn(
                `SMTP connection verification failed: ${message}. Emails may not send until credentials are configured.`,
            );
        }
    }

    // ─── OTP Email ────────────────────────────────────────────────────────────

    async sendOtp(email: string, otp: string, templateType: OtpTemplateType): Promise<void> {
        const from = this.configService.get<string>('SMTP_FROM');

        const templateFn = OTP_EMAIL_TEMPLATES[templateType];
        if (!templateFn) {
            throw new Error(`Unsupported OTP template type: ${templateType as string}`);
        }
        const template = templateFn(otp);

        try {
            await this.transporter.sendMail({
                from,
                to: email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });

            this.logger.log(
                `OTP email sent successfully to ${email} using ${templateType} template`,
            );
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to send OTP email to ${email}: ${message}`,
            );
            throw error;
        }
    }

    // ─── New Login Notification ───────────────────────────────────────────────

    /**
     * Sends a new-login security alert email with device information.
     * Called non-blocking from AuthService after every successful authentication.
     */
    async sendLoginNotification(
        email: string,
        data: NewLoginEmailData,
    ): Promise<void> {
        const from = this.configService.get<string>('SMTP_FROM');
        const template = getNewLoginEmailTemplate(data);

        try {
            await this.transporter.sendMail({
                from,
                to: email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });

            this.logger.log(
                `New login notification email sent to ${email} — device: ${data.deviceName}`,
            );
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to send new login email to ${email}: ${message}`,
            );
            throw error;
        }
    }
}
