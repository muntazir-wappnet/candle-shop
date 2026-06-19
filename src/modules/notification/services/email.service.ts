import {
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { INotificationChannel } from '../interfaces/notification-channel.interface';

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


    // ─── Generic Delivery ─────────────────────────────────────────────────────

    /**
     * Generic email delivery — pure SMTP transport.
     * All template rendering must be performed by the caller.
     * Use this for any notification that is NOT OTP-based.
     */
    async send(
        to: string,
        template: { subject: string; html: string; text: string },
    ): Promise<void> {
        const from = this.configService.get<string>('SMTP_FROM');
        try {
            await this.transporter.sendMail({
                from,
                to,
                subject: template.subject,
                html:    template.html,
                text:    template.text,
            });
            this.logger.log(`Generic email sent to ${to} — subject: "${template.subject}"`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to send generic email to ${to}: ${message}`);
            throw error;
        }
    }
}

